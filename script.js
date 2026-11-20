/* ==========================================================
   Body Scent — shared script (product.html, order.html, admin.html)
   Each section runs only if its page's elements exist.
   ========================================================== */

var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnKLcctl0Pk2J-qj7HX5XTIF-a5DoGmLPd1gbMuHT3239DqiL-DTYzTc29TpCx5ATw/exec';
var SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXRr8HzpJOnN7mMhsb10c9awl1nBhwmNspvMtLQd3h4ISY8J-Cvm83mVh0FMebukNoIN60upNlEr9S/pub?gid=0&single=true&output=csv';

var MOODS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'fresh', label: 'Fresh' },
  { key: 'sweet', label: 'Sweet' },
  { key: 'confident', label: 'Confident' },
  { key: 'romance', label: 'Romance' }
];

var TYPE_LABELS = { spray: 'ฉีดตัว', rollon: 'โรลออน' };

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('product-list')) initProductPage();
  if (document.getElementById('orderForm')) initOrderPage();
  if (document.querySelector('#ordersTable tbody')) initAdminPage();
});

/* ---------- helpers ---------- */
function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function moodLabel(key) {
  for (var i = 0; i < MOODS.length; i++) {
    if (MOODS[i].key === key) return MOODS[i].label;
  }
  return key;
}

/* ==========================================================
   1) product.html
   ========================================================== */
function initProductPage() {
  var listEl = document.getElementById('product-list');
  var barEl = document.getElementById('filter-bar');
  var products = [];

  var params = new URLSearchParams(window.location.search);
  var initialMood = (params.get('mood') || 'all').toLowerCase();
  var valid = MOODS.some(function (m) { return m.key === initialMood; });
  var currentMood = valid ? initialMood : 'all';

  fetch('products.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      products = data;
      renderFilters();
      renderProducts();
    })
    .catch(function (error) {
      console.error(error);
      listEl.textContent = 'ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง';
    });

  function renderFilters() {
    if (!barEl) return;
    barEl.textContent = '';
    barEl.classList.add('filters');

    MOODS.forEach(function (m) {
      var btn = el('button', 'filter-btn', m.label);
      btn.type = 'button';
      btn.setAttribute('data-mood', m.key === 'all' ? '' : m.key);
      if (m.key === currentMood) btn.classList.add('is-active');

      btn.addEventListener('click', function () {
        currentMood = m.key;
        var buttons = barEl.querySelectorAll('.filter-btn');
        for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove('is-active');
        btn.classList.add('is-active');
        renderProducts();
      });

      barEl.appendChild(btn);
    });
  }

  function renderProducts() {
    listEl.textContent = '';
    listEl.classList.add('product-grid');

    var shown = products.filter(function (p) {
      return currentMood === 'all' || p.mood === currentMood;
    });

    if (shown.length === 0) {
      listEl.textContent = 'ยังไม่มีสินค้าในหมวดนี้';
      return;
    }

    shown.forEach(function (p) {
      listEl.appendChild(buildCard(p));
    });
  }

  function buildCard(p) {
    var card = el('article', 'product-card');
    card.setAttribute('data-mood', p.mood);

    var img = el('img', 'product-card__image');
    img.src = p.image;
    img.alt = p.name;
    img.loading = 'lazy';
    card.appendChild(img);

    var meta = el('div', 'product-card__meta');
    meta.appendChild(el('span', 'mood-dot'));
    meta.appendChild(document.createTextNode(moodLabel(p.mood)));
    card.appendChild(meta);

    card.appendChild(el('h3', 'product-card__name', p.name));

    var sizeText = (TYPE_LABELS[p.type] || p.type) + (p.size ? ' ' + p.size : '');
    card.appendChild(el('p', 'product-card__desc', sizeText));

    var footer = el('div', 'product-card__footer');
    var price = el('span', 'price', Number(p.price).toLocaleString('th-TH'));
    price.appendChild(el('small', '', 'บาท'));
    footer.appendChild(price);

    var itemName = p.name + (p.size ? ' ' + p.size : '');
    var link = el('a', 'btn btn--small', 'สั่งซื้อ');
    link.href = 'order.html?item=' + encodeURIComponent(itemName) +
                '&price=' + encodeURIComponent(p.price);
    footer.appendChild(link);

    card.appendChild(footer);
    return card;
  }
}

/* ==========================================================
   2) order.html
   ========================================================== */
function initOrderPage() {
  var form = document.getElementById('orderForm');

  // Fill #items and #total from URL parameters
  var params = new URLSearchParams(window.location.search);
  var item = params.get('item');
  var price = params.get('price');

  var itemsInput = document.getElementById('items');
  var totalInput = document.getElementById('total');
  if (item && itemsInput) itemsInput.value = item;
  if (price && totalInput) totalInput.value = price;

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;

    var payload = {
      customerName: document.getElementById('customerName').value,
      contact: document.getElementById('contact').value,
      items: document.getElementById('items').value,
      total: document.getElementById('total').value,
      note: document.getElementById('note').value
    };

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      if (submitBtn) submitBtn.disabled = false;
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    });
  });
}

/* ==========================================================
   3) admin.html
   ========================================================== */
function initAdminPage() {
  var tbody = document.querySelector('#ordersTable tbody');

  function showMessage(text) {
    tbody.textContent = '';
    var tr = el('tr');
    var td = el('td', '', text);
    td.colSpan = 6;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  showMessage('กำลังโหลดข้อมูล...');

  fetch(SHEET_CSV_URL, { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text).filter(function (r) {
        return r.some(function (cell) { return cell.trim() !== ''; });
      });

      // Sheet may have a header row: skip it if the first cell is not a date/time
      if (rows.length && !/\d/.test(rows[0][0] || '')) rows.shift();

      // Newest first (rows are appended at the bottom of the sheet)
      rows.reverse();

      if (rows.length === 0) {
        showMessage('ยังไม่มีรายการสั่งซื้อ');
        return;
      }

      tbody.textContent = '';
      rows.forEach(function (r) {
        var tr = el('tr');
        for (var i = 0; i < 6; i++) {
          tr.appendChild(el('td', '', r[i] !== undefined ? r[i] : ''));
        }
        tbody.appendChild(tr);
      });
    })
    .catch(function (error) {
      console.error(error);
      showMessage('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    });
}

/* CSV parser (no external library)
   Handles quoted fields, "" escaped quotes, commas and line breaks inside quotes,
   and both \r\n and \n line endings. Returns an array of rows (arrays of strings). */
function parseCSV(text) {
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;

  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // strip BOM

  for (var i = 0; i < text.length; i++) {
    var c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }

  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

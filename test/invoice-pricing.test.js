'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const pricing = require('../lib/pricing');
const invoice = require('../lib/invoice');

// This mirrors the line item shape built by routes/orders.js. All data remains
// in memory; these tests do not load the JSON store or touch data/db.json.
function makeOrder(items, coupon) {
  const totals = pricing.computeTotals(items, coupon || '');
  return {
    id: 1234,
    date: '22/11/2026',
    customer: 'Characterization Customer',
    paymentMode: 'cash',
    status: 'completed',
    items: items,
    coupon: coupon || '',
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total
  };
}

test('invoice uses the same HSN slab as billing', function () {
  const items = [{ id: 1, sku: 'RICE-1', name: 'Rice', hsn: '1006', price: 1000, qty: 1 }];
  const order = makeOrder(items);
  const billed = pricing.computeTotals(items, '');
  const invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    {
      gstPercent: invoiceFigures.rows[0].gstPercent,
      tax: invoiceFigures.tax,
      cgst: invoiceFigures.cgst,
      sgst: invoiceFigures.sgst,
      total: invoiceFigures.total,
      lineTax: invoiceFigures.rows[0].lineTax
    },
    { gstPercent: 5, tax: billed.tax, cgst: billed.cgst, sgst: billed.sgst, total: billed.total, lineTax: 50 }
  );
});

test('invoice uses the billed discount when calculating discounted GST', function () {
  const items = [{ id: 8, sku: 'TEA-1', name: 'Tea', hsn: '0902', price: 1000, qty: 1 }];
  const order = makeOrder(items, 'WELCOME');
  const billed = pricing.computeTotals(items, 'WELCOME');
  const invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    { discount: billed.discount, tax: billed.tax, total: billed.total },
    { discount: 50, tax: 171, total: 1121 }
  );
  assert.deepEqual(
    {
      discount: invoiceFigures.discount,
      tax: invoiceFigures.tax,
      total: invoiceFigures.total,
      lineTax: invoiceFigures.rows[0].lineTax
    },
    { discount: billed.discount, tax: billed.tax, total: billed.total, lineTax: 171 }
  );
});

test('invoice preserves the billed coupon cap and resulting tax', function () {
  const items = [{ id: 8, sku: 'TEA-1', name: 'Tea', hsn: '0902', price: 2000, qty: 1 }];
  const order = makeOrder(items, 'SAVE10');
  const billed = pricing.computeTotals(items, 'SAVE10');
  const invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    { discount: billed.discount, tax: billed.tax, total: billed.total },
    { discount: 150, tax: 333, total: 2183 }
  );
  assert.deepEqual(
    {
      discount: invoiceFigures.discount,
      tax: invoiceFigures.tax,
      total: invoiceFigures.total,
      lineTax: invoiceFigures.rows[0].lineTax
    },
    { discount: billed.discount, tax: billed.tax, total: billed.total, lineTax: 333 }
  );
});

test('rendered invoice shows HSN line GST and the billed CGST/SGST split without a mismatch notice', function () {
  const items = [{ id: 1, sku: 'RICE-1', name: 'Rice', hsn: '1006', price: 1000, qty: 1 }];
  const order = makeOrder(items);
  const html = invoice.render(order);

  assert.match(html, /<td class="r">5%<\/td>/);
  assert.match(html, /<td class="r">₹50\.00<\/td>/);
  assert.match(html, /CGST<\/td><td class="r">₹25\.00<\/td>/);
  assert.match(html, /SGST<\/td><td class="r">₹25\.00<\/td>/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});

test('invoice matches the billed order total, HSN GST, and CGST/SGST breakdown', function () {
  const items = [{ id: 1, sku: 'RICE-1', name: 'Rice', hsn: '1006', price: 1000, qty: 1 }];
  const order = makeOrder(items);
  const invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    {
      subtotal: invoiceFigures.subtotal,
      discount: invoiceFigures.discount,
      tax: invoiceFigures.tax,
      cgst: invoiceFigures.cgst,
      sgst: invoiceFigures.sgst,
      total: invoiceFigures.total,
      gstPercent: invoiceFigures.rows[0].gstPercent,
      lineTax: invoiceFigures.rows[0].lineTax
    },
    {
      subtotal: order.subtotal,
      discount: order.discount,
      tax: order.tax,
      cgst: 25,
      sgst: 25,
      total: order.total,
      gstPercent: 5,
      lineTax: 50
    }
  );

  const html = invoice.render(order);
  assert.match(html, /CGST<\/td><td class="r">₹25\.00<\/td>/);
  assert.match(html, /SGST<\/td><td class="r">₹25\.00<\/td>/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});

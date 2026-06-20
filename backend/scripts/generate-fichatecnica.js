const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');

function getIconForType(type) {
  const t = type.toLowerCase();
  if (t.includes('tropical') || t.includes('cremoso') || t.includes('frutal')) {
    return `
      <svg viewBox="0 0 24 24" class="drink-icon" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2zm-5-8.5c0-1.8 1-4 3.5-5.5V4.5a1.5 1.5 0 0 1 3 0V7c2.5 1.5 3.5 3.7 3.5 5.5s-2 4.5-5 4.5-5-2.7-5-4.5z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 4l-4 13M8 6h8" />
      </svg>
    `;
  } else if (t.includes('pura') || t.includes('café') || t.includes('clásico')) {
    return `
      <svg viewBox="0 0 24 24" class="drink-icon" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M18 3H6v15a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V3z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 8h12M7 14h10" />
      </svg>
    `;
  } else if (t.includes('burbujeante') || t.includes('ponche') || t.includes('cóctel')) {
    return `
      <svg viewBox="0 0 24 24" class="drink-icon" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 15a5 5 0 0 0 5-5V4H7v6a5 5 0 0 0 5 5z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v5M9 20h6" />
      </svg>
    `;
  } else if (t.includes('cervecero')) {
    return `
      <svg viewBox="0 0 24 24" class="drink-icon" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 5v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 8h2.5a2.5 2.5 0 0 1 0 5H17" />
        <path stroke-linecap="round" d="M7 7h6M7 11h6M7 15h6" />
      </svg>
    `;
  } else {
    return `
      <svg viewBox="0 0 24 24" class="drink-icon" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M22 3H2l10 10L22 3z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 13v8M8 21h8" />
        <circle cx="9" cy="7" r="1" fill="currentColor" />
      </svg>
    `;
  }
}

async function run() {
  console.log("Consultando base de datos para obtener los 41 productos de preparación...");
  
  // Query all active preparation products
  const dbResult = await pool.query(`
    SELECT p.id, p.nombre, p.descripcion, p.precio, p.tipo_producto, p.ficha_tecnica, c.nombre AS categoria
    FROM productos p
    JOIN categorias c ON p.categoria_id = c.id
    WHERE p.tipo_producto = 'preparacion' AND p.estado = 'Activo'
    ORDER BY p.id ASC
  `);

  const drinks = dbResult.rows.map((row) => {
    let ft = { insumos: [] };
    if (row.ficha_tecnica) {
      if (typeof row.ficha_tecnica === 'object') {
        ft = row.ficha_tecnica;
      } else {
        try {
          ft = JSON.parse(row.ficha_tecnica);
        } catch (_) {}
      }
    }
    return {
      id: row.id,
      name: row.nombre,
      type: row.categoria,
      ingredients: ft.insumos.map((ins) => ({
        name: ins.insumo_nombre,
        amount: Number(ins.cantidad),
        unit: ins.unidad
      }))
    };
  });

  console.log(`Se encontraron ${drinks.length} productos de preparación en la base de datos.`);

  console.log("Generando PDF de fichatecnica.pdf con escalas de consumos...");
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  let htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Tabla Dinámica de Ficha Técnica y Consumos</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #1e293b;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 210mm;
      height: 297mm;
      padding: 15mm;
      page-break-after: always;
      position: relative;
      background: #ffffff;
      overflow: hidden;
    }

    /* Cover Page styling */
    .cover-page {
      background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
      color: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      padding: 35mm 20mm 20mm 20mm;
    }

    .cover-badge {
      display: inline-block;
      border: 2px solid #f59e0b;
      color: #f59e0b;
      padding: 6px 16px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      border-radius: 4px;
    }

    .cover-title {
      font-family: 'Playfair Display', serif;
      font-size: 40px;
      font-weight: 700;
      line-height: 1.3;
      color: #ffffff;
      margin-bottom: 12px;
      margin-top: 40px;
    }

    .cover-subtitle {
      font-size: 16px;
      font-weight: 300;
      color: #9ca3af;
      letter-spacing: 1px;
      max-width: 550px;
      margin: 0 auto;
    }

    .cover-divider {
      width: 60px;
      height: 3px;
      background: #f59e0b;
      margin: 25px auto;
      border-radius: 2px;
    }

    .cover-desc {
      font-size: 13px;
      color: #d1d5db;
      max-width: 460px;
      margin: 0 auto;
      line-height: 1.5;
    }

    .cover-footer {
      width: 100%;
      border-top: 1px solid #374151;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #9ca3af;
    }

    .cover-footer-bold {
      font-weight: 600;
      color: #f3f4f6;
    }

    /* Index Table */
    .section-header {
      border-bottom: 2px solid #f3f4f6;
      padding-bottom: 10px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      color: #111827;
    }

    .section-subtitle {
      font-size: 12px;
      color: #6b7280;
    }

    /* Recipe Section */
    .recipe-row {
      margin-bottom: 25px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 15px;
      background: #ffffff;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    }

    .recipe-meta-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .recipe-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .recipe-icon-box {
      width: 44px;
      height: 44px;
      background: #fef3c7;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #d97706;
    }

    .recipe-title-text {
      display: flex;
      flex-direction: column;
    }

    .recipe-number {
      font-size: 10px;
      font-weight: 700;
      color: #d97706;
      letter-spacing: 0.5px;
    }

    .recipe-name {
      font-family: 'Playfair Display', serif;
      font-size: 18px;
      font-weight: 700;
      color: #111827;
    }

    .recipe-type {
      background: #f3f4f6;
      color: #4b5563;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }

    /* Scaling Table styling */
    .scale-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }

    .scale-table th {
      background: #f9fafb;
      color: #4b5563;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 12px;
      text-align: left;
      border-bottom: 2px solid #e5e7eb;
    }

    .scale-table th.scale-header {
      text-align: right;
      font-weight: 700;
      color: #111827;
      background: #f3f4f6;
    }

    .scale-table td {
      padding: 8px 12px;
      font-size: 12px;
      border-bottom: 1px solid #f3f4f6;
      color: #374151;
    }

    .scale-table td.ing-name {
      font-weight: 600;
      color: #111827;
    }

    .scale-table td.scale-val {
      text-align: right;
      font-family: monospace;
      font-size: 12px;
      font-weight: 500;
    }

    .scale-table tr:last-child td {
      border-bottom: none;
    }

    /* Footer styling */
    .page-footer {
      position: absolute;
      bottom: 12mm;
      left: 15mm;
      right: 15mm;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #9ca3af;
    }

    .page-footer-right {
      font-weight: 600;
      color: #4b5563;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="page cover-page">
    <div class="cover-logo-area">
      <div class="cover-badge">Manual de Producción</div>
    </div>
    <div>
      <h1 class="cover-title">CÁLCULO DE CONSUMO DE INSUMOS</h1>
      <p class="cover-subtitle">Tablas de Ficha Técnica Escalables para Preparación de Bebidas</p>
      <div class="cover-divider"></div>
      <p class="cover-desc">
        Esta guía contiene la cantidad exacta de insumos requerida para cada una de las ${drinks.length} bebidas de preparación registradas en el catálogo de Grandma's Liquors, proyectando el consumo de ingredientes según la cantidad de unidades o medidas a elaborar (1, 5, 10, 25 y 50 unidades).
      </p>
    </div>
    <div class="cover-footer">
      <div style="text-align: left;">
        <p>Control de Inventarios:</p>
        <p class="cover-footer-bold">Grandma's Liquors</p>
      </div>
      <div style="text-align: right;">
        <p>Fecha:</p>
        <p class="cover-footer-bold">${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>
  </div>
  `;

  // We have N drinks. We fit 2 recipe scaling cards per page perfectly.
  for (let i = 0; i < drinks.length; i += 2) {
    const d1 = drinks[i];
    const d2 = drinks[i + 1];
    const pageNum = Math.floor(i / 2) + 2;

    htmlContent += `
  <div class="page">
    <div class="section-header">
      <h2 class="section-title">Manual de Escalamiento</h2>
      <span class="section-subtitle">Páginas de Consumo e Insumos • Pág. ${pageNum}</span>
    </div>
    
    <!-- Drink 1 Card -->
    <div class="recipe-row">
      <div class="recipe-meta-header">
        <div class="recipe-info">
          <div class="recipe-icon-box">
            ${getIconForType(d1.type)}
          </div>
          <div class="recipe-title-text">
            <span class="recipe-number">BEBIDA #${d1.id.toString().padStart(2, '0')}</span>
            <span class="recipe-name">${d1.name}</span>
          </div>
        </div>
        <span class="recipe-type">${d1.type}</span>
      </div>
      
      <table class="scale-table">
        <thead>
          <tr>
            <th>Insumo Requerido</th>
            <th class="scale-header">1 Unidad (Base)</th>
            <th class="scale-header">5 Unids.</th>
            <th class="scale-header">10 Unids.</th>
            <th class="scale-header">25 Unids.</th>
            <th class="scale-header">50 Unids.</th>
          </tr>
        </thead>
        <tbody>
          ${d1.ingredients.map(ing => `
            <tr>
              <td class="ing-name">${ing.name}</td>
              <td class="scale-val" style="color: #d97706; font-weight: bold;">${ing.amount} ${ing.unit}</td>
              <td class="scale-val">${ing.amount * 5} ${ing.unit}</td>
              <td class="scale-val">${ing.amount * 10} ${ing.unit}</td>
              <td class="scale-val">${ing.amount * 25} ${ing.unit}</td>
              <td class="scale-val">${ing.amount * 50} ${ing.unit}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    `;

    if (d2) {
      htmlContent += `
    <!-- Drink 2 Card -->
    <div class="recipe-row">
      <div class="recipe-meta-header">
        <div class="recipe-info">
          <div class="recipe-icon-box">
            ${getIconForType(d2.type)}
          </div>
          <div class="recipe-title-text">
            <span class="recipe-number">BEBIDA #${d2.id.toString().padStart(2, '0')}</span>
            <span class="recipe-name">${d2.name}</span>
          </div>
        </div>
        <span class="recipe-type">${d2.type}</span>
      </div>
      
      <table class="scale-table">
        <thead>
          <tr>
            <th>Insumo Requerido</th>
            <th class="scale-header">1 Unidad (Base)</th>
            <th class="scale-header">5 Unids.</th>
            <th class="scale-header">10 Unids.</th>
            <th class="scale-header">25 Unids.</th>
            <th class="scale-header">50 Unids.</th>
          </tr>
        </thead>
        <tbody>
          ${d2.ingredients.map(ing => `
            <tr>
              <td class="ing-name">${ing.name}</td>
              <td class="scale-val" style="color: #d97706; font-weight: bold;">${ing.amount} ${ing.unit}</td>
              <td class="scale-val">${ing.amount * 5} ${ing.unit}</td>
              <td class="scale-val">${ing.amount * 10} ${ing.unit}</td>
              <td class="scale-val">${ing.amount * 25} ${ing.unit}</td>
              <td class="scale-val">${ing.amount * 50} ${ing.unit}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
      `;
    }

    htmlContent += `
    <div class="page-footer">
      <span>Grandma's Liquors • Ficha Técnica de Consumos</span>
      <span class="page-footer-right">Pág. ${pageNum}</span>
    </div>
  </div>
    `;
  }

  htmlContent += `
</body>
</html>
  `;

  // Write temporary html
  const tempHtmlPath = path.join(__dirname, 'temp_scale.html');
  if (fs.existsSync(tempHtmlPath)) {
    fs.unlinkSync(tempHtmlPath);
  }
  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

  // Load in Puppeteer and print to PDF
  await page.goto('file://' + tempHtmlPath, { waitUntil: 'networkidle0' });

  const targetDir = 'C:\\Users\\User\\repos\\grandmas_liquors\\ficha tecnica de bebidas e insumos';
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const pdfPath = path.join(targetDir, 'fichatecnica.pdf');
  try {
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm'
      }
    });
    console.log(`✅ PDF fichatecnica.pdf generado exitosamente en: ${pdfPath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.error(`\n❌ ERROR: El archivo PDF está abierto en otro programa.`);
      console.error(`👉 Por favor, CIERRA el archivo: ${pdfPath}`);
      console.error(`   y vuelve a intentar.\n`);
    } else {
      throw err;
    }
  }

  await browser.close();
  fs.unlinkSync(tempHtmlPath);
}

run().catch(err => {
  console.error("❌ Error generando PDF:", err);
  process.exit(1);
}).finally(() => {
  pool.end();
});

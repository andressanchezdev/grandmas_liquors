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
      ingredients: ft.insumos.map((ins) => `${ins.insumo_nombre} (${ins.cantidad} ${ins.unidad})`)
    };
  });

  console.log(`Se encontraron ${drinks.length} productos de preparación en la base de datos.`);
  console.log("Generando PDF de Fichas Técnicas...");

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
  <title>Fichas Técnicas de Bebidas e Insumos</title>
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

    .cover-page {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      padding: 30mm 20mm 20mm 20mm;
      height: 297mm;
    }

    .cover-logo-badge {
      display: inline-block;
      border: 2px solid #d97706;
      color: #d97706;
      padding: 8px 18px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 20px;
      border-radius: 4px;
    }

    .cover-title-group {
      margin-top: 40px;
    }

    .cover-title {
      font-family: 'Playfair Display', serif;
      font-size: 48px;
      font-weight: 700;
      line-height: 1.2;
      color: #ffffff;
      margin-bottom: 15px;
    }

    .cover-subtitle {
      font-size: 18px;
      font-weight: 300;
      color: #94a3b8;
      letter-spacing: 1px;
      max-width: 500px;
      margin: 0 auto;
    }

    .cover-divider {
      width: 80px;
      height: 3px;
      background: #d97706;
      margin: 30px auto;
      border-radius: 2px;
    }

    .cover-footer {
      width: 100%;
      border-top: 1px solid #334155;
      padding-top: 25px;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #64748b;
    }

    .cover-footer-bold {
      font-weight: 600;
      color: #cbd5e1;
    }

    .index-header {
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }

    .index-title {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      color: #0f172a;
    }

    .index-subtitle {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }

    .index-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    .index-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 12px;
      text-align: left;
      border-bottom: 2px solid #e2e8f0;
    }

    .index-table td {
      padding: 8px 12px;
      font-size: 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }

    .index-table td.num {
      font-weight: 700;
      color: #d97706;
      width: 40px;
    }

    .index-table td.name {
      font-weight: 600;
      color: #0f172a;
    }

    .type-badge {
      display: inline-block;
      background: #f1f5f9;
      color: #475569;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }

    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      color: #0f172a;
    }

    .section-meta {
      font-size: 12px;
      color: #64748b;
    }

    .cards-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      height: calc(100% - 30mm);
    }

    .recipe-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 15px;
      background: #ffffff;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }

    .recipe-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: #d97706;
      border-top-left-radius: 12px;
      border-bottom-left-radius: 12px;
    }

    .card-title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .card-id {
      font-size: 11px;
      font-weight: 700;
      color: #d97706;
      letter-spacing: 1px;
    }

    .card-name {
      font-family: 'Playfair Display', serif;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }

    .card-body {
      display: grid;
      grid-template-columns: 60px 1fr;
      gap: 15px;
      align-items: center;
      margin-top: 10px;
    }

    .icon-container {
      width: 52px;
      height: 52px;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #d97706;
    }

    .drink-icon {
      width: 28px;
      height: 28px;
    }

    .ingredients-container {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .ingredients-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      color: #64748b;
    }

    .ingredients-list {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      list-style-type: none;
    }

    .ingredient-tag {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #334155;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .ingredient-tag::before {
      content: '•';
      color: #d97706;
      font-weight: bold;
    }

    .page-footer {
      position: absolute;
      bottom: 12mm;
      left: 15mm;
      right: 15mm;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
    }

    .page-footer-right {
      font-weight: 600;
      color: #64748b;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="page cover-page">
    <div class="cover-logo-area">
      <div class="cover-logo-badge">Catálogo Oficial</div>
    </div>
    <div class="cover-title-group">
      <h1 class="cover-title">FICHA TÉCNICA</h1>
      <p class="cover-subtitle">Manual de Bebidas, Cócteles e Insumos de Preparación</p>
      <div class="cover-divider"></div>
      <p style="font-size: 14px; color: #94a3b8; font-weight: 300;">Recetario Estándar de Producción</p>
    </div>
    <div class="cover-footer">
      <div style="text-align: left;">
        <p>Preparado para:</p>
        <p class="cover-footer-bold">Grandma's Liquors</p>
      </div>
      <div style="text-align: right;">
        <p>Fecha de Emisión:</p>
        <p class="cover-footer-bold">${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>
  </div>

  <!-- Index Page 1 (Drinks 1-20) -->
  <div class="page">
    <div class="index-header">
      <h2 class="index-title">Índice de Bebidas (1/2)</h2>
      <p class="index-subtitle">Listado oficial de productos de preparación y su clasificación</p>
    </div>
    <table class="index-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Nombre de la Bebida</th>
          <th>Clasificación</th>
          <th>Insumos Principales</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Populate Index (first 20)
  drinks.slice(0, 20).forEach(d => {
    htmlContent += `
        <tr>
          <td class="num">${d.id.toString().padStart(2, '0')}</td>
          <td class="name">${d.name}</td>
          <td><span class="type-badge">${d.type}</span></td>
          <td style="color: #64748b; font-size: 11px;">${d.ingredients.join(', ')}</td>
        </tr>
    `;
  });

  htmlContent += `
      </tbody>
    </table>
    <div class="page-footer">
      <span>Grandma's Liquors • Catálogo de Bebidas</span>
      <span class="page-footer-right">Pág. 2</span>
    </div>
  </div>

  <!-- Index Page 2 (Drinks 21+) -->
  <div class="page">
    <div class="index-header">
      <h2 class="index-title">Índice de Bebidas (2/2)</h2>
      <p class="index-subtitle">Listado oficial de productos de preparación y su clasificación</p>
    </div>
    <table class="index-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Nombre de la Bebida</th>
          <th>Clasificación</th>
          <th>Insumos Principales</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Populate Index (remaining)
  drinks.slice(20).forEach(d => {
    htmlContent += `
        <tr>
          <td class="num">${d.id.toString().padStart(2, '0')}</td>
          <td class="name">${d.name}</td>
          <td><span class="type-badge">${d.type}</span></td>
          <td style="color: #64748b; font-size: 11px;">${d.ingredients.join(', ')}</td>
        </tr>
    `;
  });

  htmlContent += `
      </tbody>
    </table>
    <div class="page-footer">
      <span>Grandma's Liquors • Catálogo de Bebidas</span>
      <span class="page-footer-right">Pág. 3</span>
    </div>
  </div>
  `;

  // Render Detailed Drink pages (2 drinks per page)
  for (let i = 0; i < drinks.length; i += 2) {
    const d1 = drinks[i];
    const d2 = drinks[i + 1];
    const pageNum = Math.floor(i / 2) + 4;

    htmlContent += `
  <div class="page">
    <div class="section-header">
      <h2 class="section-title">Especificación de Preparación</h2>
      <span class="section-meta">Fichas Técnicas #${d1.id} - ${d2 ? '#' + d2.id : 'Fin'}</span>
    </div>
    <div class="cards-container">
      
      <!-- Recipe Card 1 -->
      <div class="recipe-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="card-title-group">
            <span class="card-id">FICHA TÉCNICA #${d1.id.toString().padStart(2, '0')}</span>
            <h3 class="card-name">${d1.name}</h3>
          </div>
          <span class="type-badge">${d1.type}</span>
        </div>
        <div class="card-body">
          <div class="icon-container">
            ${getIconForType(d1.type)}
          </div>
          <div class="ingredients-container">
            <span class="ingredients-title">Insumos Requeridos</span>
            <ul class="ingredients-list">
              ${d1.ingredients.map(ing => `<li class="ingredient-tag">${ing}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;

    if (d2) {
      htmlContent += `
      <!-- Recipe Card 2 -->
      <div class="recipe-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="card-title-group">
            <span class="card-id">FICHA TÉCNICA #${d2.id.toString().padStart(2, '0')}</span>
            <h3 class="card-name">${d2.name}</h3>
          </div>
          <span class="type-badge">${d2.type}</span>
        </div>
        <div class="card-body">
          <div class="icon-container">
            ${getIconForType(d2.type)}
          </div>
          <div class="ingredients-container">
            <span class="ingredients-title">Insumos Requeridos</span>
            <ul class="ingredients-list">
              ${d2.ingredients.map(ing => `<li class="ingredient-tag">${ing}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
      `;
    } else {
      htmlContent += `
      <div style="flex: 1; border: 1px dashed #cbd5e1; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 14px;">
        Fin del Catálogo de Bebidas
      </div>
      `;
    }

    htmlContent += `
    </div>
    
    <div class="page-footer">
      <span>Grandma's Liquors • Catálogo de Bebidas</span>
      <span class="page-footer-right">Pág. ${pageNum}</span>
    </div>
  </div>
    `;
  }

  htmlContent += `
</body>
</html>
  `;

  // Write temporary html file
  const tempHtmlPath = path.join(__dirname, 'temp_recipes.html');
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

  const pdfPath = path.join(targetDir, 'Ficha Tecnica de Bebidas e Insumos.pdf');
  
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
    console.log(`✅ PDF generado exitosamente en: ${pdfPath}`);
  } catch (err) {
    if (err.code === 'EBUSY' || err.message.includes('EBUSY')) {
      console.error(`❌ ERROR: El archivo PDF está abierto en otro programa y bloqueado.`);
      console.error(`👉 Cierra el visor de PDF (como Chrome o Adobe) que tiene abierto "${pdfPath}" e intenta de nuevo.`);
      process.exit(1);
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

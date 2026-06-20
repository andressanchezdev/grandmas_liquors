const fs = require('fs');
const path = require('path');

const terminados = [
  { name: 'Whisky Andino 750ml', cat: 1, desc: 'Whisky suave con notas de roble y vainilla', price: 68000.00, stock: 24, min: 6 },
  { name: 'Whisky Reserva Roble 750ml', cat: 1, desc: 'Whisky madurado con perfil intenso y especiado', price: 82000.00, stock: 18, min: 5 },
  { name: 'Ron Caribe Dorado 750ml', cat: 2, desc: 'Ron dorado ideal para cocteleria y consumo solo', price: 42000.00, stock: 32, min: 8 },
  { name: 'Ron Anejo Gran Barrica 750ml', cat: 2, desc: 'Ron anejo con final largo y aroma tostado', price: 59000.00, stock: 20, min: 6 },
  { name: 'Vino Tinto Casa Vieja 750ml', cat: 3, desc: 'Vino tinto afrutado de cuerpo medio', price: 36000.00, stock: 28, min: 8 },
  { name: 'Vino Blanco Monteluna 750ml', cat: 3, desc: 'Vino blanco fresco con notas citricas', price: 34000.00, stock: 22, min: 6 },
  { name: 'Espumoso Brisa Rosa 750ml', cat: 3, desc: 'Espumoso semidulce para celebraciones', price: 39000.00, stock: 16, min: 5 },
  { name: 'Cerveza Rubia Artesanal 330ml', cat: 4, desc: 'Cerveza ligera con amargor balanceado', price: 6500.00, stock: 72, min: 18 },
  { name: 'Cerveza Roja Artesanal 330ml', cat: 4, desc: 'Cerveza maltosa con notas caramelizadas', price: 6900.00, stock: 65, min: 15 },
  { name: 'Cerveza Negra Porter 330ml', cat: 4, desc: 'Cerveza oscura con notas a cacao y cafe', price: 7200.00, stock: 54, min: 14 },
  { name: 'Tequila Agave Azul 750ml', cat: 5, desc: 'Tequila joven 100 por ciento agave', price: 76000.00, stock: 14, min: 4 },
  { name: 'Tequila Reposado Sierra 750ml', cat: 5, desc: 'Tequila reposado con notas de miel y madera', price: 89000.00, stock: 12, min: 4 },
  { name: 'Vodka Cristal 700ml', cat: 6, desc: 'Vodka clasico de perfil limpio y neutro', price: 47000.00, stock: 26, min: 7 },
  { name: 'Vodka Citrus 700ml', cat: 6, desc: 'Vodka saborizado con limon y cascara de naranja', price: 49000.00, stock: 19, min: 5 },
  { name: 'Ginebra Botanica 750ml', cat: 8, desc: 'Ginebra artesanal con botanicos colombianos', price: 78000.00, stock: 15, min: 4 }
];

const fixedInsumos = [
  { id: 16, name: 'Tequila Base', desc: 'Tequila a granel para coctelería', price: 45000.00, stock: 50, min: 10, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 17, name: 'Triple Sec Base', desc: 'Licor triple sec para coctelería', price: 38000.00, stock: 30, min: 8, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 18, name: 'Jugo de Limon', desc: 'Jugo de limón natural filtrado', price: 12000.00, stock: 40, min: 10, unit: 'Mililitros', qty: 1000, cat: 12 },
  { id: 19, name: 'Sal x kg', desc: 'Sal refinada', price: 2500.00, stock: 10, min: 2, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 20, name: 'Ron Blanco Base', desc: 'Ron blanco para mezclas', price: 35000.00, stock: 60, min: 12, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 21, name: 'Crema de Coco', desc: 'Crema de coco para piña colada y cocoloco', price: 15000.00, stock: 45, min: 10, unit: 'Mililitros', qty: 500, cat: 12 },
  { id: 22, name: 'Jugo de Pina', desc: 'Jugo de piña pasteurizado', price: 10000.00, stock: 50, min: 10, unit: 'Mililitros', qty: 1000, cat: 12 },
  { id: 23, name: 'Leche Condensada', desc: 'Leche condensada pote', price: 12000.00, stock: 30, min: 8, unit: 'Mililitros', qty: 350, cat: 12 },
  { id: 24, name: 'Whisky Base', desc: 'Whisky estándar para mezclas', price: 55000.00, stock: 40, min: 10, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 25, name: 'Hielo Bolsas', desc: 'Bolsa de hielo en cubos', price: 3500.00, stock: 100, min: 20, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 26, name: 'Hierbabuena Fresca', desc: 'Atado de hierbabuena fresca', price: 2000.00, stock: 50, min: 10, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 27, name: 'Lima Unidad', desc: 'Limas frescas', price: 500.00, stock: 200, min: 50, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 28, name: 'Azucar x kg', desc: 'Azúcar blanca', price: 3200.00, stock: 30, min: 5, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 29, name: 'Soda Lata 300ml', desc: 'Agua con gas en lata', price: 2500.00, stock: 120, min: 30, unit: 'Mililitros', qty: 300, cat: 12 },
  { id: 30, name: 'Amargo de Angostura', desc: 'Licor amargo concentrado', price: 75000.00, stock: 10, min: 2, unit: 'Mililitros', qty: 100, cat: 12 },
  { id: 31, name: 'Naranja Unidad', desc: 'Naranjas frescas', price: 600.00, stock: 150, min: 40, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 32, name: 'Fresas Frescas', desc: 'Fresas seleccionadas', price: 8000.00, stock: 40, min: 10, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 33, name: 'Jugo de Naranja', desc: 'Jugo de naranja natural', price: 9000.00, stock: 40, min: 10, unit: 'Mililitros', qty: 1000, cat: 12 },
  { id: 34, name: 'Granadina Jarabe', desc: 'Jarabe de granadina', price: 18000.00, stock: 20, min: 5, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 35, name: 'Ginebra Base', desc: 'Ginebra estándar para coctelería', price: 48000.00, stock: 30, min: 8, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 36, name: 'Campari Base', desc: 'Licor amargo Campari', price: 65000.00, stock: 25, min: 6, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 37, name: 'Vermut Rojo Base', desc: 'Vermut rosso dulce', price: 42000.00, stock: 25, min: 6, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 38, name: 'Prosecco Botella', desc: 'Vino espumoso Prosecco', price: 52000.00, stock: 30, min: 8, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 39, name: 'Cola Lata 300ml', desc: 'Gaseosa sabor cola en lata', price: 2200.00, stock: 150, min: 40, unit: 'Mililitros', qty: 300, cat: 12 },
  { id: 40, name: 'Cachaca Base', desc: 'Licor brasileño Cachaça', price: 46000.00, stock: 20, min: 5, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 41, name: 'Vodka Base', desc: 'Vodka estándar para mezclas', price: 39000.00, stock: 40, min: 10, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 42, name: 'Jugo de Tomate', desc: 'Jugo de tomate para Bloody Mary', price: 11000.00, stock: 30, min: 8, unit: 'Mililitros', qty: 1000, cat: 12 },
  { id: 43, name: 'Especias Varias', desc: 'Salsas y condimentos para Bloody Mary', price: 15000.00, stock: 15, min: 3, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 44, name: 'Apio Unidad', desc: 'Tallos de apio fresco', price: 1500.00, stock: 50, min: 15, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 45, name: 'Vino Tinto Base', desc: 'Vino tinto joven para sangría', price: 28000.00, stock: 50, min: 10, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 46, name: 'Frutas Varias', desc: 'Mezcla de frutas picadas para sangría', price: 6000.00, stock: 30, min: 5, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 47, name: 'Brandy Base', desc: 'Licor Brandy para mezcla', price: 54000.00, stock: 20, min: 5, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 48, name: 'Agua Tonica Lata', desc: 'Agua tónica en lata', price: 2600.00, stock: 120, min: 30, unit: 'Mililitros', qty: 300, cat: 12 },
  { id: 49, name: 'Enebro Bayas', desc: 'Bayas de enebro deshidratadas x bolsa', price: 9000.00, stock: 15, min: 4, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 50, name: 'Pisco Base', desc: 'Licor Pisco para chilcano y sour', price: 59000.00, stock: 25, min: 6, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 51, name: 'Ginger Ale Lata', desc: 'Gaseosa ginger ale en lata', price: 2600.00, stock: 120, min: 30, unit: 'Mililitros', qty: 300, cat: 12 },
  { id: 52, name: 'Cerveza Base', desc: 'Cerveza rubia para michelada', price: 3500.00, stock: 200, min: 45, unit: 'Mililitros', qty: 330, cat: 12 },
  { id: 53, name: 'Salsa Picante', desc: 'Salsa de chile picante', price: 8500.00, stock: 20, min: 5, unit: 'Mililitros', qty: 150, cat: 12 },
  { id: 54, name: 'Licor 43 Base', desc: 'Licor 43 español para carajillo', price: 89000.00, stock: 18, min: 5, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 55, name: 'Cafe Expreso', desc: 'Café expreso concentrado', price: 18000.00, stock: 40, min: 10, unit: 'Mililitros', qty: 1000, cat: 12 },
  { id: 56, name: 'Flor de Jamaica', desc: 'Flor de jamaica seca x paquete', price: 8000.00, stock: 25, min: 6, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 57, name: 'Agua Purificada', desc: 'Agua filtrada pura', price: 1500.00, stock: 100, min: 20, unit: 'Mililitros', qty: 1000, cat: 12 },
  { id: 58, name: 'Clara de Huevo', desc: 'Clara de huevo deshidratada / fresca', price: 12000.00, stock: 15, min: 4, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 59, name: 'Crema de Leche', desc: 'Crema de leche líquida', price: 14000.00, stock: 20, min: 5, unit: 'Mililitros', qty: 500, cat: 12 },
  { id: 60, name: 'Almibar Simple', desc: 'Jarabe de azúcar y agua', price: 8000.00, stock: 30, min: 8, unit: 'Mililitros', qty: 1000, cat: 12 },
  { id: 61, name: 'Jugo de Arandano', desc: 'Jugo de arándanos embotellado', price: 16000.00, stock: 25, min: 6, unit: 'Mililitros', qty: 1000, cat: 12 },
  { id: 62, name: 'Licor de Durazno', desc: 'Licor Peach Schnapps para mezclas', price: 34000.00, stock: 20, min: 5, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 63, name: 'Pure de Durazno', desc: 'Puré de durazno concentrado', price: 18000.00, stock: 15, min: 4, unit: 'Mililitros', qty: 500, cat: 12 },
  { id: 64, name: 'Menta Fresca', desc: 'Hojas de menta fresca', price: 2500.00, stock: 30, min: 8, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 65, name: 'Jarabe de Frambuesa', desc: 'Sirope de frambuesa dulce', price: 22000.00, stock: 15, min: 4, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 66, name: 'Ron Oscuro Base', desc: 'Ron oscuro para coctelería', price: 44000.00, stock: 20, min: 5, unit: 'Mililitros', qty: 750, cat: 12 },
  { id: 67, name: 'Cerveza de Jengibre', desc: 'Ginger Beer para Moscow Mule', price: 4800.00, stock: 100, min: 25, unit: 'Mililitros', qty: 330, cat: 12 },
  { id: 68, name: 'Canela Astillas', desc: 'Canela en astillas x bolsa', price: 6000.00, stock: 20, min: 5, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 69, name: 'Panela Bloque', desc: 'Panela de caña de azúcar', price: 4500.00, stock: 50, min: 10, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 70, name: 'Limon Unidad', desc: 'Limón de castilla fresco', price: 400.00, stock: 300, min: 80, unit: 'Unidades', qty: 1, cat: 12 },
  { id: 71, name: 'Esencia de Vainilla', desc: 'Esencia de vainilla x frasco', price: 12000.00, stock: 20, min: 5, unit: 'Mililitros', qty: 250, cat: 12 }
];

// 41 Preparations
const preparaciones = [
  { name: "Margarita Clásica", type: "Cóctel", price: 25000, ings: [{ id: 16, qty: 50, unit: 'Mililitros' }, { id: 17, qty: 25, unit: 'Mililitros' }, { id: 18, qty: 20, unit: 'Mililitros' }, { id: 19, qty: 1, unit: 'Unidades' }] },
  { name: "Cocoloco", type: "Cóctel tropical", price: 28000, ings: [{ id: 20, qty: 45, unit: 'Mililitros' }, { id: 21, qty: 30, unit: 'Mililitros' }, { id: 22, qty: 60, unit: 'Mililitros' }, { id: 23, qty: 15, unit: 'Mililitros' }] },
  { name: "Whisky en Rocas", type: "Bebida pura", price: 30000, ings: [{ id: 24, qty: 60, unit: 'Mililitros' }, { id: 25, qty: 3, unit: 'Unidades' }] },
  { name: "Mojito Cubano", type: "Cóctel refrescante", price: 22000, ings: [{ id: 20, qty: 45, unit: 'Mililitros' }, { id: 64, qty: 1, unit: 'Unidades' }, { id: 27, qty: 1, unit: 'Unidades' }, { id: 28, qty: 1, unit: 'Unidades' }, { id: 29, qty: 120, unit: 'Mililitros' }] },
  { name: "Piña Colada", type: "Cóctel cremoso", price: 26000, ings: [{ id: 20, qty: 45, unit: 'Mililitros' }, { id: 21, qty: 45, unit: 'Mililitros' }, { id: 22, qty: 90, unit: 'Mililitros' }, { id: 25, qty: 4, unit: 'Unidades' }] },
  { name: "Old Fashioned", type: "Cóctel clásico", price: 32000, ings: [{ id: 24, qty: 60, unit: 'Mililitros' }, { id: 28, qty: 1, unit: 'Unidades' }, { id: 30, qty: 2, unit: 'Mililitros' }, { id: 31, qty: 1, unit: 'Unidades' }] },
  { name: "Daiquiri de Fresa", type: "Cóctel frutal", price: 24000, ings: [{ id: 20, qty: 45, unit: 'Mililitros' }, { id: 32, qty: 4, unit: 'Unidades' }, { id: 18, qty: 15, unit: 'Mililitros' }, { id: 28, qty: 1, unit: 'Unidades' }] },
  { name: "Tequila Sunrise", type: "Cóctel colorido", price: 25000, ings: [{ id: 16, qty: 45, unit: 'Mililitros' }, { id: 33, qty: 120, unit: 'Mililitros' }, { id: 34, qty: 15, unit: 'Mililitros' }] },
  { name: "Negroni", type: "Cóctel amargo", price: 29000, ings: [{ id: 35, qty: 30, unit: 'Mililitros' }, { id: 36, qty: 30, unit: 'Mililitros' }, { id: 37, qty: 30, unit: 'Mililitros' }] },
  { name: "Aperol Spritz", type: "Cóctel burbujeante", price: 34000, ings: [{ id: 36, qty: 60, unit: 'Mililitros' }, { id: 38, qty: 90, unit: 'Mililitros' }, { id: 29, qty: 30, unit: 'Mililitros' }, { id: 31, qty: 1, unit: 'Unidades' }] },
  { name: "Paloma", type: "Cóctel mexicano", price: 23000, ings: [{ id: 16, qty: 45, unit: 'Mililitros' }, { id: 33, qty: 90, unit: 'Mililitros' }, { id: 29, qty: 60, unit: 'Mililitros' }, { id: 19, qty: 1, unit: 'Unidades' }] },
  { name: "Cuba Libre", type: "Cóctel clásico", price: 20000, ings: [{ id: 20, qty: 45, unit: 'Mililitros' }, { id: 39, qty: 120, unit: 'Mililitros' }, { id: 18, qty: 10, unit: 'Mililitros' }] },
  { name: "Caipirinha", type: "Cóctel brasileño", price: 22000, ings: [{ id: 40, qty: 60, unit: 'Mililitros' }, { id: 27, qty: 1, unit: 'Unidades' }, { id: 28, qty: 1, unit: 'Unidades' }, { id: 25, qty: 4, unit: 'Unidades' }] },
  { name: "Bloody Mary", type: "Cóctel salado", price: 25000, ings: [{ id: 41, qty: 45, unit: 'Mililitros' }, { id: 42, qty: 120, unit: 'Mililitros' }, { id: 43, qty: 1, unit: 'Unidades' }, { id: 44, qty: 1, unit: 'Unidades' }] },
  { name: "Sangría", type: "Ponche frutal", price: 26000, ings: [{ id: 45, qty: 120, unit: 'Mililitros' }, { id: 46, qty: 1, unit: 'Unidades' }, { id: 47, qty: 15, unit: 'Mililitros' }, { id: 29, qty: 60, unit: 'Mililitros' }] },
  { name: "Gin Tonic", type: "Cóctel burbujeante", price: 27000, ings: [{ id: 35, qty: 45, unit: 'Mililitros' }, { id: 48, qty: 120, unit: 'Mililitros' }, { id: 49, qty: 1, unit: 'Unidades' }, { id: 27, qty: 1, unit: 'Unidades' }] },
  { name: "Chilcano de Pisco", type: "Cóctel peruano", price: 28000, ings: [{ id: 50, qty: 60, unit: 'Mililitros' }, { id: 18, qty: 15, unit: 'Mililitros' }, { id: 51, qty: 120, unit: 'Mililitros' }, { id: 30, qty: 1, unit: 'Mililitros' }] },
  { name: "Michelada", type: "Cóctel cervecero", price: 15000, ings: [{ id: 52, qty: 330, unit: 'Mililitros' }, { id: 18, qty: 30, unit: 'Mililitros' }, { id: 53, qty: 5, unit: 'Mililitros' }, { id: 19, qty: 1, unit: 'Unidades' }] },
  { name: "Carajillo", type: "Cóctel café", price: 28000, ings: [{ id: 54, qty: 45, unit: 'Mililitros' }, { id: 55, qty: 45, unit: 'Mililitros' }, { id: 25, qty: 3, unit: 'Unidades' }] },
  { name: "Agua Fresca de Jamaica", type: "Bebida sin alcohol", price: 10000, ings: [{ id: 56, qty: 1, unit: 'Unidades' }, { id: 28, qty: 1, unit: 'Unidades' }, { id: 57, qty: 200, unit: 'Mililitros' }, { id: 25, qty: 4, unit: 'Unidades' }] },
  { name: "Limoncello Macerado", type: "Macerado", price: 22000, ings: [{ id: 57, qty: 500, unit: 'Mililitros' }, { id: 70, qty: 5, unit: 'Unidades' }, { id: 28, qty: 2, unit: 'Unidades' }, { id: 71, qty: 5, unit: 'Mililitros' }] },
  { name: "Crema Irlandesa Casera", type: "Crema", price: 28000, ings: [{ id: 24, qty: 150, unit: 'Mililitros' }, { id: 23, qty: 150, unit: 'Mililitros' }, { id: 59, qty: 150, unit: 'Mililitros' }, { id: 71, qty: 5, unit: 'Mililitros' }] },
  { name: "Cosmopolitan", type: "Cóctel clásico", price: 26000, ings: [{ id: 41, qty: 45, unit: 'Mililitros' }, { id: 17, qty: 15, unit: 'Mililitros' }, { id: 61, qty: 30, unit: 'Mililitros' }, { id: 18, qty: 15, unit: 'Mililitros' }] },
  { name: "Manhattan", type: "Cóctel clásico", price: 32000, ings: [{ id: 24, qty: 60, unit: 'Mililitros' }, { id: 37, qty: 30, unit: 'Mililitros' }, { id: 30, qty: 2, unit: 'Mililitros' }] },
  { name: "Martini Seco", type: "Cóctel clásico", price: 27000, ings: [{ id: 35, qty: 60, unit: 'Mililitros' }, { id: 37, qty: 10, unit: 'Mililitros' }, { id: 43, qty: 1, unit: 'Unidades' }] },
  { name: "Moscow Mule", type: "Cóctel refrescante", price: 29000, ings: [{ id: 41, qty: 45, unit: 'Mililitros' }, { id: 67, qty: 120, unit: 'Mililitros' }, { id: 18, qty: 15, unit: 'Mililitros' }] },
  { name: "Tom Collins", type: "Cóctel refrescante", price: 24000, ings: [{ id: 35, qty: 45, unit: 'Mililitros' }, { id: 18, qty: 30, unit: 'Mililitros' }, { id: 60, qty: 15, unit: 'Mililitros' }, { id: 29, qty: 60, unit: 'Mililitros' }] },
  { name: "Sex on the Beach", type: "Cóctel tropical", price: 28000, ings: [{ id: 41, qty: 45, unit: 'Mililitros' }, { id: 62, qty: 30, unit: 'Mililitros' }, { id: 33, qty: 60, unit: 'Mililitros' }, { id: 61, qty: 60, unit: 'Mililitros' }] },
  { name: "Bellini", type: "Cóctel burbujeante", price: 28000, ings: [{ id: 38, qty: 100, unit: 'Mililitros' }, { id: 63, qty: 50, unit: 'Mililitros' }] },
  { name: "Tequila Sour", type: "Cóctel clásico", price: 25000, ings: [{ id: 16, qty: 50, unit: 'Mililitros' }, { id: 18, qty: 25, unit: 'Mililitros' }, { id: 60, qty: 15, unit: 'Mililitros' }, { id: 58, qty: 1, unit: 'Unidades' }] },
  { name: "Pisco Sour", type: "Cóctel clásico", price: 29000, ings: [{ id: 50, qty: 50, unit: 'Mililitros' }, { id: 18, qty: 25, unit: 'Mililitros' }, { id: 60, qty: 15, unit: 'Mililitros' }, { id: 58, qty: 1, unit: 'Unidades' }, { id: 30, qty: 1, unit: 'Mililitros' }] },
  { name: "White Russian", type: "Cóctel cremoso", price: 27000, ings: [{ id: 41, qty: 45, unit: 'Mililitros' }, { id: 54, qty: 30, unit: 'Mililitros' }, { id: 59, qty: 30, unit: 'Mililitros' }] },
  { name: "Black Russian", type: "Cóctel clásico", price: 25000, ings: [{ id: 41, qty: 45, unit: 'Mililitros' }, { id: 54, qty: 30, unit: 'Mililitros' }] },
  { name: "Daiquiri Clásico", type: "Cóctel clásico", price: 22000, ings: [{ id: 20, qty: 45, unit: 'Mililitros' }, { id: 18, qty: 25, unit: 'Mililitros' }, { id: 60, qty: 15, unit: 'Mililitros' }] },
  { name: "Mint Julep", type: "Cóctel clásico", price: 26000, ings: [{ id: 24, qty: 60, unit: 'Mililitros' }, { id: 64, qty: 1, unit: 'Unidades' }, { id: 28, qty: 1, unit: 'Unidades' }, { id: 57, qty: 10, unit: 'Mililitros' }] },
  { name: "Clover Club", type: "Cóctel clásico", price: 28000, ings: [{ id: 35, qty: 45, unit: 'Mililitros' }, { id: 65, qty: 15, unit: 'Mililitros' }, { id: 18, qty: 15, unit: 'Mililitros' }, { id: 58, qty: 1, unit: 'Unidades' }] },
  { name: "Dark and Stormy", type: "Cóctel refrescante", price: 26000, ings: [{ id: 66, qty: 60, unit: 'Mililitros' }, { id: 67, qty: 120, unit: 'Mililitros' }, { id: 27, qty: 1, unit: 'Unidades' }] },
  { name: "Irish Coffee", type: "Cóctel café", price: 29000, ings: [{ id: 24, qty: 45, unit: 'Mililitros' }, { id: 55, qty: 120, unit: 'Mililitros' }, { id: 28, qty: 1, unit: 'Unidades' }, { id: 59, qty: 30, unit: 'Mililitros' }] },
  { name: "Mimosa", type: "Cóctel burbujeante", price: 22000, ings: [{ id: 38, qty: 75, unit: 'Mililitros' }, { id: 33, qty: 75, unit: 'Mililitros' }] },
  { name: "Sangría Blanca", type: "Ponche frutal", price: 26000, ings: [{ id: 38, qty: 120, unit: 'Mililitros' }, { id: 46, qty: 1, unit: 'Unidades' }, { id: 17, qty: 15, unit: 'Mililitros' }, { id: 29, qty: 60, unit: 'Mililitros' }] },
  { name: "Canelazo", type: "Bebida caliente", price: 18000, ings: [{ id: 20, qty: 45, unit: 'Mililitros' }, { id: 68, qty: 1, unit: 'Unidades' }, { id: 69, qty: 1, unit: 'Unidades' }, { id: 18, qty: 15, unit: 'Mililitros' }] }
];

async function run() {
  const dbFile = path.join(__dirname, '../db.pgsql');
  if (!fs.existsSync(dbFile)) {
    console.log("db.pgsql not found:", dbFile);
    return;
  }
  let sqlContent = fs.readFileSync(dbFile, 'utf8');

  // Add ficha_tecnica JSONB column directly to CREATE TABLE productos if not present
  const createTablePattern = /CREATE TABLE productos \([\s\S]+?\);/;
  const matchTable = sqlContent.match(createTablePattern);
  if (matchTable) {
    const tableDef = matchTable[0];
    if (!tableDef.includes('ficha_tecnica')) {
      const updatedTableDef = tableDef.replace(
        'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        'ficha_tecnica JSONB,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
      );
      sqlContent = sqlContent.replace(tableDef, updatedTableDef);
      console.log("Added ficha_tecnica JSONB to CREATE TABLE productos definition");
    }
  }

  // Generate insert SQL statement
  let insertSql = `-- Insertar productos (112) - 15 terminados, 56 insumos, 41 de preparación\n`;
  insertSql += `INSERT INTO productos (id, nombre, categoria_id, descripcion, precio, stock, stock_minimo, estado, tipo_producto, insumo_unidad_medida, insumo_cantidad_medida, ficha_tecnica, imagen_url) VALUES\n`;

  const allProductRows = [];

  // 15 Terminados (IDs 1-15)
  terminados.forEach((t, i) => {
    const id = i + 1;
    const img = `/uploads/productos/seed_${String(id).padStart(2, '0')}.webp`;
    allProductRows.push(`(${id}, '${t.name}', ${t.cat}, '${t.desc}', ${t.price.toFixed(2)}, ${t.stock}, ${t.min}, 'Activo', 'terminado', NULL, NULL, NULL, '${img}')`);
  });

  // 56 Insumos (IDs 16-71)
  fixedInsumos.forEach((ins) => {
    const img = `/uploads/productos/seed_${String(ins.id).padStart(2, '0')}.webp`;
    allProductRows.push(`(${ins.id}, '${ins.name}', ${ins.cat}, '${ins.desc}', ${ins.price.toFixed(2)}, ${ins.stock}, ${ins.min}, 'Activo', 'insumo', '${ins.unit}', ${ins.qty.toFixed(4)}, NULL, '${img}')`);
  });

  // 41 Preparaciones (IDs 72-112)
  preparaciones.forEach((prep, i) => {
    const id = i + 72;
    const img = `/uploads/productos/seed_${String(id).padStart(2, '0')}.webp`;
    
    // Construct JSON for ficha_tecnica
    const ftInsumos = prep.ings.map(ing => {
      const insName = fixedInsumos.find(inObj => inObj.id === ing.id).name;
      return {
        producto_catalogo_id: ing.id,
        insumo_nombre: insName,
        cantidad: ing.qty,
        unidad: ing.unit
      };
    });
    const ftJson = JSON.stringify({ insumos: ftInsumos }).replace(/'/g, "''");

    allProductRows.push(`(${id}, '${prep.name}', 11, 'Preparación artesanal de ${prep.name}', ${prep.price.toFixed(2)}, 0, 0, 'Activo', 'preparacion', NULL, NULL, '${ftJson}'::jsonb, '${img}')`);
  });

  insertSql += allProductRows.join(',\n') + ';\n';

  // Replace INSERT INTO productos in db.pgsql
  const productsInsertPattern = /-- Insertar productos [\s\S]+?UPDATE categorias c/i;
  const matchInsert = sqlContent.match(productsInsertPattern);
  if (matchInsert) {
    sqlContent = sqlContent.replace(matchInsert[0], insertSql + '\n\nUPDATE categorias c');
    console.log("Successfully replaced products seed in db.pgsql");
  } else {
    // Try backup matching
    const altPattern = /INSERT INTO productos [\s\S]+?UPDATE/i;
    const altMatch = sqlContent.match(altPattern);
    if (altMatch) {
      sqlContent = sqlContent.replace(altMatch[0], insertSql + '\n\nUPDATE');
      console.log("Successfully replaced products seed (backup) in db.pgsql");
    } else {
      console.error("❌ Error: Could not find insert block in db.pgsql");
      return;
    }
  }

  // Add sequence reset for productos
  const seqResetMarker = `\n-- Actualizar secuencia de productos\nSELECT setval('productos_id_seq', (SELECT MAX(id) FROM productos));\n`;
  if (!sqlContent.includes("setval('productos_id_seq'")) {
    sqlContent = sqlContent.replace('UPDATE categorias c', seqResetMarker + '\nUPDATE categorias c');
    console.log("Added seq reset to db.pgsql");
  }

  fs.writeFileSync(dbFile, sqlContent, 'utf8');
  console.log("db.pgsql written successfully!");
}

run();

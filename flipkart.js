const fs = require('fs');
const path = require('path');

// Configurations
const JSON_FILE_PATH = 'C:/Users/ak066/Downloads/product-catalog.json';
const OUTPUT_DIR = 'C:/Users/ak066/Desktop/Flipkart_Listings';
const CONCURRENCY_LIMIT = 5;

// Helper to sanitize folder and file names
function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// Helper to clean HTML entities in description/text
function cleanHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Async file download helper using native fetch
async function downloadImage(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  await fs.promises.writeFile(destPath, Buffer.from(buffer));
}

// Concurrency-limited promise runner
async function mapLimit(array, limit, fn) {
  const results = [];
  let index = 0;
  
  async function runWorker() {
    while (index < array.length) {
      const curIndex = index++;
      const item = array[curIndex];
      try {
        results[curIndex] = await fn(item, curIndex);
      } catch (err) {
        results[curIndex] = { error: err.message || err };
      }
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(limit, array.length); i++) {
    workers.push(runWorker());
  }
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log(`Reading product catalog from: ${JSON_FILE_PATH}`);
  if (!fs.existsSync(JSON_FILE_PATH)) {
    console.error(`Error: File does not exist at ${JSON_FILE_PATH}`);
    process.exit(1);
  }

  const fileData = fs.readFileSync(JSON_FILE_PATH, 'utf8');
  let catalog;
  try {
    catalog = JSON.parse(fileData);
  } catch (e) {
    console.error('Error: Failed to parse JSON file.', e);
    process.exit(1);
  }

  const products = catalog.products || [];
  console.log(`Found ${products.length} products to process.`);

  // Create root folder
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created root folder: ${OUTPUT_DIR}`);
  } else {
    console.log(`Root folder already exists: ${OUTPUT_DIR}`);
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const indexStr = String(i + 1).padStart(2, '0');
    const folderName = `${indexStr}_${sanitizeName(product.handle)}`;
    const productFolderPath = path.join(OUTPUT_DIR, folderName);
    const imagesFolderPath = path.join(productFolderPath, 'images');

    console.log(`\n[${indexStr}/${products.length}] Processing: ${product.title}`);

    // Create product directory & images directory
    fs.mkdirSync(productFolderPath, { recursive: true });
    fs.mkdirSync(imagesFolderPath, { recursive: true });

    // 1. Prepare Product Text File
    const title = product.title || '';
    const brand = product.vendor || 'Generic';
    const collections = (product.collections || []).join(', ');
    const tags = (product.tags || []).join(', ');
    const description = cleanHtmlEntities(product.description || '');
    
    // Auto-calculate discount percentage if compareAtPrice is present
    let pricingSummary = '';
    const basePrice = product.minPrice || 0;
    const comparePrice = product.compareAtPrice || 0;
    if (comparePrice > basePrice) {
      const discount = Math.round(((comparePrice - basePrice) / comparePrice) * 100);
      pricingSummary = `Selling Price : INR ${basePrice}\nMRP (Retail)  : INR ${comparePrice}\nDiscount      : ${discount}% OFF`;
    } else {
      pricingSummary = `Selling Price : INR ${basePrice}\nMRP (Retail)  : INR ${basePrice} (No discount)`;
    }

    // Build variants information
    let variantsText = 'Flipkart requires a unique SKU ID for each variant. Recommended options:\n';
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((v, vIndex) => {
        const optionParts = [];
        if (v.selectedOptions) {
          for (const [key, val] of Object.entries(v.selectedOptions)) {
            optionParts.push(`${key}: ${val}`);
          }
        }
        const optionStr = optionParts.join(', ') || 'Default';
        
        // Generate recommended SKU: [BRAND]-[HANDLE]-[OPTIONS]
        const brandCode = brand.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
        const handleCode = sanitizeName(product.handle).toUpperCase().slice(0, 15);
        const optCode = optionParts.map(o => o.split(': ')[1]).join('-').toUpperCase().replace(/[^A-Z0-9-]/g, '');
        const recommendedSku = v.sku || `${brandCode}-${handleCode}${optCode ? '-' + optCode : ''}`;

        variantsText += `\n* Variant #${vIndex + 1} (${optionStr})
  - Recommended SKU : ${recommendedSku}
  - Price           : INR ${v.price || basePrice}
  - MRP (Compare)   : INR ${v.compareAtPrice || comparePrice || 'N/A'}
  - Inventory Stock : ${v.inventoryQuantity !== undefined ? v.inventoryQuantity : 100}
  - Weight (grams)  : ${v.weightInGrams || 'N/A'}
  - Variant ID      : ${v.id}`;
      });
    } else {
      const brandCode = brand.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
      const handleCode = sanitizeName(product.handle).toUpperCase().slice(0, 15);
      const recommendedSku = `${brandCode}-${handleCode}`;
      variantsText += `\n* Single Product
  - Recommended SKU : ${recommendedSku}
  - Price           : INR ${basePrice}
  - MRP (Compare)   : INR ${comparePrice || 'N/A'}
  - Inventory Stock : 100`;
    }

    // Prepare image list URLs for copy-pasting
    let sortedImages = [...(product.images || [])];
    const featured = product.featuredImage;
    if (featured) {
      sortedImages = [featured, ...sortedImages.filter(img => img !== featured)];
    }

    let imagesText = '';
    let cloudinaryText = '';
    sortedImages.forEach((imgUrl, imgIdx) => {
      const isFeatured = imgUrl === featured ? ' (Featured Image)' : '';
      imagesText += `${imgIdx + 1}. image_${imgIdx + 1}.jpg${isFeatured}\n`;
      cloudinaryText += `${imgIdx + 1}. ${imgUrl}${isFeatured}\n`;
    });

    const infoContent = `======================================================================
FLIPKART LISTING ASSISTANT: ${title}
======================================================================

--- BASIC INFO ---
Product Title  : ${title}
Brand / Vendor : ${brand}
Collections    : ${collections}
Tags           : ${tags}
Handle/Slug    : ${product.handle}
Database ID    : ${product.id}

--- PRICING & STOCK ---
${pricingSummary}

--- VARIANTS & SKU CODES ---
${variantsText}

--- PRODUCT DESCRIPTION ---
${description}

--- IMAGES IN FOLDER ---
${imagesText}
--- ORIGINAL IMAGE LINKS (CLOUDINARY) ---
If you need to copy/paste image URLs directly:
${cloudinaryText}
`;

    // Write text file
    fs.writeFileSync(path.join(productFolderPath, 'product_info.txt'), infoContent, 'utf8');

    // 2. Download Images
    console.log(`Downloading ${sortedImages.length} images...`);
    const downloadJobs = sortedImages.map((url, imgIdx) => ({
      url,
      destPath: path.join(imagesFolderPath, `image_${imgIdx + 1}${path.extname(url) || '.jpg'}`)
    }));

    const downloadResults = await mapLimit(downloadJobs, CONCURRENCY_LIMIT, async (job) => {
      await downloadImage(job.url, job.destPath);
      return true;
    });

    const errors = downloadResults.filter(res => res && res.error);
    if (errors.length > 0) {
      console.warn(`  Warning: ${errors.length} images failed to download:`);
      errors.forEach((err, idx) => {
        console.warn(`    - Error ${idx + 1}: ${err.error}`);
      });
      failCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n======================================================`);
  console.log(`COMPLETED!`);
  console.log(`Total Products: ${products.length}`);
  console.log(`Fully Successful: ${successCount}`);
  console.log(`Partially Failed/Errors: ${failCount}`);
  console.log(`Root output folder: ${OUTPUT_DIR}`);
  console.log(`======================================================`);
}

main().catch(err => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});

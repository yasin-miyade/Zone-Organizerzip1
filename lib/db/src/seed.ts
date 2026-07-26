import { db, toolsTable, siteSettingsTable, blogsTable, articlesTable, defaultTools } from "./index";

const tools = defaultTools;

const settings = [
  { key: "site_title", value: "5toolbox - Free Online File Tools" },
  { key: "site_description", value: "Free browser-based file toolkit — merge PDFs, compress images, convert files, generate QR codes and more." },
  { key: "admin_password", value: "admin123" },
  { key: "total_visitors", value: "0" },
  { key: "adsense_enabled", value: "false" },
];

const defaultBlogs = [
  {
    slug: "how-to-compress-pdf",
    title: "How to Compress PDF Files Online Without Losing Quality",
    summary: "Learn the secrets to compressing PDF files safely and locally in your browser without uploading sensitive files to cloud servers.",
    content: "## Why Compress PDF Files?\nPDF documents can easily grow in size, especially when they contain high-resolution scans, images, or graphics. Large PDF files can be difficult to email, upload to portals, or share over messaging apps.\n\n## The Risks of Online PDF Compressors\nMost traditional online compressors require you to upload your files to their external servers. This poses significant privacy and security risks, particularly for personal, medical, or financial documents.\n\n## The 5toolbox Solution\nWith **5toolbox**, we use advanced browser APIs and WebAssembly to compress PDFs directly on your device. Your file never leaves your computer, making it 100% private and extremely fast.\n\n### Steps to Compress a PDF on 5toolbox:\n1. Navigate to the **Compress PDF** tool page.\n2. Drag and drop your PDF file into the upload zone.\n3. Adjust the compression level (Low, Medium, or High) based on your balance preference between size and visual quality.\n4. Click 'Compress' and download your optimized PDF instantly!",
    metaTitle: "Compress PDF Online Without Quality Loss - 5toolbox Guide",
    metaDescription: "Step-by-step guide to compressing PDF files locally in your browser. Fast, 100% secure, and offline capable using 5toolbox.",
    tags: ["pdf", "compression", "privacy", "productivity"],
    category: "PDF Tools",
    authorName: "5toolbox Editor",
    readTime: 4,
  },
  {
    slug: "optimizing-images-core-web-vitals",
    title: "Optimizing Images for Core Web Vitals & Faster Page Load",
    summary: "Image sizes heavily affect your website's performance and Google ranking. Learn how to convert and compress images effectively.",
    content: "## The Importance of Core Web Vitals\nCore Web Vitals are a set of metrics used by Google to measure user experience, including loading performance (LCP), interactivity (FID), and visual stability (CLS). Images are often the primary cause of poor LCP scores.\n\n## Best Formats for Web Images\n* **WebP**: Offers superior lossless and lossy compression compared to PNG and JPEG.\n* **AVIF**: Next-gen compression that results in even smaller sizes, though support is slightly newer.\n\n## How to Optimize Your Images\n1. **Resize Dimensions**: Do not upload a 4000px image if it only renders at 800px width.\n2. **Compress Wisely**: Aim for an index quality level of 80% to shave off 70-80% of file weight with zero noticeable difference.\n3. **Use 5toolbox**: Switch to the **Compress Image** tool, upload your file, select WebP or JPG, and download the compressed copy in seconds.",
    metaTitle: "Optimize Web Images for Google Core Web Vitals - 5toolbox Blog",
    metaDescription: "Learn how image compression and next-gen formats like WebP affect your site's LCP and how to optimize them safely in your browser.",
    tags: ["image", "seo", "web-vitals", "optimization"],
    category: "Image Tools",
    authorName: "SEO Specialist",
    readTime: 5,
  }
];

const defaultArticles = [
  {
    slug: "what-is-browser-based-file-processing",
    title: "What is Browser-Based File Processing and Why is it Safer?",
    summary: "Explore the technology behind WebAssembly and client-side processing that keeps your files 100% private.",
    content: "## What is Client-Side Processing?\nTraditionally, websites that process files (like converting a Word document to PDF) upload your file to their server, process it on their backend CPU, and send the result back to you.\n\n## The Security Loophole\nWhile this works, it means a copy of your document resides on someone else's server, making it vulnerable to hacks, leakage, or logging.\n\n## Enter WebAssembly (Wasm)\nWebAssembly is a technology that allows programming languages like C, C++, and Rust to run directly inside the browser at near-native speeds. It allows 5toolbox to run full compression and conversion algorithms locally inside your browser tab. Your files never leave your device, ensuring maximum security.",
    metaTitle: "Security Guide: What is Browser-Based File Processing? - 5toolbox",
    metaDescription: "A technical guide to client-side file processing, WebAssembly, and why browser-based tools are the future of secure document management.",
    authorName: "Security Team",
    readTime: 3,
  }
];

async function seed() {
  console.log("Seeding database...");
  try {
    // Seed tools
    for (const tool of tools) {
      await db.insert(toolsTable).values(tool).onConflictDoUpdate({
        target: toolsTable.slug,
        set: tool,
      });
    }
    console.log(`Successfully seeded ${tools.length} tools.`);

    // Seed settings
    for (const setting of settings) {
      await db.insert(siteSettingsTable).values(setting).onConflictDoUpdate({
        target: siteSettingsTable.key,
        set: setting,
      });
    }
    console.log(`Successfully seeded ${settings.length} site settings.`);

    // Seed blogs
    for (const blog of defaultBlogs) {
      await db.insert(blogsTable).values(blog).onConflictDoUpdate({
        target: blogsTable.slug,
        set: blog,
      });
    }
    console.log(`Successfully seeded ${defaultBlogs.length} blogs.`);

    // Seed articles
    for (const article of defaultArticles) {
      await db.insert(articlesTable).values(article).onConflictDoUpdate({
        target: articlesTable.slug,
        set: article,
      });
    }
    console.log(`Successfully seeded ${defaultArticles.length} articles.`);

    console.log("Seeding complete!");
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}

seed().catch(err => {
  console.error("Unhandled seeding error:", err);
});

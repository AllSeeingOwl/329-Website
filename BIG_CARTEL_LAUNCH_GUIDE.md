# Big Cartel Launch Guide

When you are ready to sell your physical artefact and launch your Big Cartel storefront, follow these specific steps to link the game to your shop and maintain the narrative aesthetic.

## 1. Update the Action Button Link

The main entry point to your store is currently on the Secure Data Drop page.

1. Open `public/secure-data-drop-page.html`.
2. Locate the "PROCURE PHYSICAL ARTEFACT" button. It currently points to a placeholder:
   ```html
   <a href="procure-physical-artefact.html" class="btn-store">PROCURE PHYSICAL ARTEFACT</a>
   ```
3. Replace `"procure-physical-artefact.html"` with your full, live Big Cartel URL (e.g., `"https://your-store.bigcartel.com"`).
4. Save the file.

*(Optional)* You may also want to update or delete the `public/procure-physical-artefact.html` placeholder file to ensure users don't accidentally navigate to it directly, though it will naturally stop receiving traffic once the button is updated.

## 2. Apply the "Team Rabbit" Custom Theme

To make your Big Cartel shop look like it belongs in the ARG universe (a hacked, terminal-style storefront), you need to inject custom CSS into your Big Cartel admin dashboard.

1. Log into your Big Cartel admin panel.
2. Navigate to **Account** -> **Design** (or the Design / Customization tab).
3. Look for the **Advanced** section or a place to enter **Custom CSS** / **Edit Theme**.
   *(Note: The exact location varies depending on the specific Big Cartel template you are using. The "Luna" or "Neat" themes are recommended as base templates because they have straightforward DOM structures).*
4. Open the file `public/Big Cartel CSS.txt` in your local code repository.
5. Copy the *entire contents* of that text file.
6. Paste the contents into the Custom CSS block in Big Cartel.
7. Save and publish your theme changes.

## 3. Verify Storefront Functionality

After linking the site and styling the store:
* Click the "PROCURE PHYSICAL ARTEFACT" button on the Secure Data Drop page to ensure it correctly opens your shop.
* View your Big Cartel shop and verify that the fonts (VT323, Anton), colors (black/red/green), and borders match the ARG aesthetic.
* Test that interactive elements (links, add-to-cart buttons) have the expected red hover states and green dashed focus outlines.
* Check that form inputs (text boxes, quantity selectors) have the expected red glow when clicked.
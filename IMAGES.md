The check used Playwright at 1440px and 390px with deviceScaleFactor 2. No displayed image was under 2x its rendered size, and none were stretched. No AI upscaler is connected, so nothing was resized upward.

| page | image path | natural size | display size | problem | fix |
| --- | --- | --- | --- | --- | --- |
| not shown | public/products/pack-extra.jpg | 1000x1000 | not displayed | www.ncteaandgift.com crosses the box and the pitcher | left as the original |

Eight packs were cut to transparent PNG and lossless WebP. Each original sits beside the cut as name.orig.jpg. pack-box, pack-front, pack-hero, pack-back, pack-side, pack-side-b, pack-bag, and pack-bottom. field.jpg is a landscape and is not a pack cutout.

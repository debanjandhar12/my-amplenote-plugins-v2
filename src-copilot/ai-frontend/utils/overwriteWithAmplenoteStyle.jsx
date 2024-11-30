export const overwriteWithAmplenoteStyle = () => {
    const body = document.body;
    // Inject Radix UI colors
    const styleEl = document.createElement('style');
    styleEl.innerText = `
    .dark, .dark-theme, :is(.dark, .dark-theme) :where(.radix-themes:not(.light, .light-theme)) {
        --color-background: #272f35;
    }
    .dark, .dark-theme {
        --gray-1: #292f33;
        --gray-2: #2f3539;
        --gray-3: #343c43;
        --gray-4: #36414b;
        --gray-5: #3a4651;
        --gray-6: #3e4d5a;
        --gray-7: #455968;
        --gray-8: #577084;
        --gray-9: #617b8f;
        --gray-10: #6d8599;
        --gray-11: #a7bac9;
        --gray-12: #eaeff3;

        --gray-a1: #d12f0003;
        --gray-a2: #f4c99b0a;
        --gray-a3: #e0e8fc12;
        --gray-a4: #b0d3fe1c;
        --gray-a5: #aed2fb24;
        --gray-a6: #a4d2fe2f;
        --gray-a7: #9dd4fe41;
        --gray-a8: #a1d4ff64;
        --gray-a9: #a8d9ff72;
        --gray-a10: #b3dbfd7f;
        --gray-a11: #d6ecffbb;
        --gray-a12: #f7fbfff0;

        --gray-contrast: #FFFFFF;
        --gray-surface: rgba(0, 0, 0, 0.05);
        --gray-indicator: #617b8f;
        --gray-track: #617b8f;
    }
    @supports (color: color(display-p3 1 1 1)) {
        @media (color-gamut: p3) {
            .dark, .dark-theme {
                --gray-1: oklch(30% 0.0115 242.8);
                --gray-2: oklch(32.3% 0.0119 242.8);
                --gray-3: oklch(35.3% 0.0166 242.8);
                --gray-4: oklch(37.1% 0.0213 242.8);
                --gray-5: oklch(38.8% 0.024 242.8);
                --gray-6: oklch(41.2% 0.0288 242.8);
                --gray-7: oklch(45.3% 0.035 242.8);
                --gray-8: oklch(53.4% 0.0433 242.8);
                --gray-9: oklch(57% 0.0433 242.8);
                --gray-10: oklch(60.5% 0.0412 242.8);
                --gray-11: oklch(77.9% 0.0302 242.8);
                --gray-12: oklch(94.9% 0.0081 242.8);

                --gray-a1: color(display-p3 0.9451 0.1843 0 / 0.005);
                --gray-a2: color(display-p3 0.9961 0.898 0.8 / 0.033);
                --gray-a3: color(display-p3 0.902 0.9255 1 / 0.069);
                --gray-a4: color(display-p3 0.698 0.8353 0.9961 / 0.109);
                --gray-a5: color(display-p3 0.702 0.8353 1 / 0.138);
                --gray-a6: color(display-p3 0.6784 0.8275 1 / 0.183);
                --gray-a7: color(display-p3 0.6588 0.8235 1 / 0.252);
                --gray-a8: color(display-p3 0.6824 0.8392 1 / 0.385);
                --gray-a9: color(display-p3 0.7059 0.8549 1 / 0.439);
                --gray-a10: color(display-p3 0.749 0.8706 1 / 0.488);
                --gray-a11: color(display-p3 0.8667 0.9294 1 / 0.725);
                --gray-a12: color(display-p3 0.9725 0.9843 1 / 0.941);

                --gray-contrast: #FFFFFF;
                --gray-surface: color(display-p3 0 0 0 / 5%);
                --gray-indicator: oklch(57% 0.0433 242.8);
                --gray-track: oklch(57% 0.0433 242.8);
            }
        }
    }
    .dark, .dark-theme {
        --accent-1: #252f3c;
        --accent-2: #253141;
        --accent-3: #223e64;
        --accent-4: #1a467f;
        --accent-5: #1e508f;
        --accent-6: #275b9e;
        --accent-7: #2e68b2;
        --accent-8: #3277cf;
        --accent-9: #0080ff;
        --accent-10: #3378d0;
        --accent-11: #7cbaff;
        --accent-12: #cbe3ff;

        --accent-a1: #002ffc09;
        --accent-a2: #084ff510;
        --accent-a3: #126ffc3c;
        --accent-a4: #046dfe5e;
        --accent-a5: #1379ff72;
        --accent-a6: #2784ff85;
        --accent-a7: #328bff9e;
        --accent-a8: #368dffc3;
        --accent-a9: #0080ff;
        --accent-a10: #378effc4;
        --accent-a11: #7cbaff;
        --accent-a12: #cbe3ff;

        --accent-contrast: #fff;
        --accent-surface: #24334d80;
        --accent-indicator: #0080ff;
        --accent-track: #0080ff;
    }

    @supports (color: color(display-p3 1 1 1)) {
        @media (color-gamut: p3) {
            .dark, .dark-theme {
                --accent-1: oklch(30% 0.0278 256.1);
                --accent-2: oklch(31% 0.0325 256.1);
                --accent-3: oklch(36.2% 0.074 256.1);
                --accent-4: oklch(39.6% 0.1073 256.1);
                --accent-5: oklch(43.2% 0.1173 256.1);
                --accent-6: oklch(47.1% 0.1224 256.1);
                --accent-7: oklch(51.7% 0.1323 256.1);
                --accent-8: oklch(57% 0.1522 256.1);
                --accent-9: oklch(61.5% 0.2108 256.1);
                --accent-10: oklch(57.3% 0.1522 256.1);
                --accent-11: oklch(78% 0.1427 256.1);
                --accent-12: oklch(90.8% 0.0525 256.1);

                --accent-a1: color(display-p3 0 0.1882 0.9882 / 0.035);
                --accent-a2: color(display-p3 0.0314 0.3176 0.9922 / 0.06);
                --accent-a3: color(display-p3 0.1608 0.4314 1 / 0.222);
                --accent-a4: color(display-p3 0.1294 0.4275 1 / 0.35);
                --accent-a5: color(display-p3 0.1882 0.4824 1 / 0.424);
                --accent-a6: color(display-p3 0.2549 0.5216 1 / 0.498);
                --accent-a7: color(display-p3 0.2902 0.5529 1 / 0.597);
                --accent-a8: color(display-p3 0.3098 0.5569 1 / 0.734);
                --accent-a9: color(display-p3 0.2157 0.5059 1 / 0.961);
                --accent-a10: color(display-p3 0.3137 0.5647 1 / 0.739);
                --accent-a11: color(display-p3 0.5529 0.7373 0.9961 / 0.971);
                --accent-a12: color(display-p3 0.8235 0.8941 1 / 0.986);

                --accent-contrast: #fff;
                --accent-surface: color(display-p3 0.1529 0.1961 0.2902 / 0.5);
                --accent-indicator: oklch(61.5% 0.2108 256.1);
                --accent-track: oklch(61.5% 0.2108 256.1);
            }
        }
    }`.replace(/\s+/g, ' ').trim();
    styleEl.innerText += `
    .app-container .radix-themes {
        --default-font-size: 15px;
    }
    `.replace(/\s+/g, ' ').trim();
    body.appendChild(styleEl);

    // Inject Assistant UI colors
    const styleEl2 = document.createElement('style');
    styleEl2.innerText = `
        .dark {
        --aui-background: 210, 10%, 18%; 
        --aui-foreground: 210, 10%, 94%;
        --aui-card: 210, 10%, 20%;       
        --aui-card-foreground: 210, 10%, 94%;
        --aui-popover: 210, 10%, 22%;    
        --aui-popover-foreground: 210, 10%, 94%;
        --aui-border: 210, 10%, 50%;     
        --aui-input: 210, 10%, 50%;      
        --aui-ring: 210, 10%, 18%;       
    
        --aui-primary: 205 80% 50%;   
        --aui-primary-foreground: 0, 0%, 100%;
        --aui-secondary: 205, 10%, 94%;  
        --aui-secondary-foreground: 205, 10%, 18%;
    
        --aui-muted-foreground: 205, 10%, 50%;
        --aui-accent: 205, 100%, 50%;    
        --aui-accent-foreground: 0, 0%, 100%;
    
        --aui-destructive: 0, 84%, 60%;  
        --aui-destructive-foreground: 0, 0%, 98%;
    
        --aui-radius: 0.3rem;
    }`.replace(/\s+/g, ' ').trim();
    body.appendChild(styleEl2);
}
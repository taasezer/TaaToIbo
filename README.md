# TaaToIbo

**Textile Art & Apparel → Isolated Background-free Object**

A web application that extracts printed graphic designs from garment photos. Upload a photo of a t-shirt, hoodie, or jacket — TaaToIbo detects the print using Gemini 2.5 Pro Vision AI, removes the fabric, and outputs the isolated flat design.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│                                                               │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│  │ DropZone  │──→│ ImagePreview │──→│ SelectionOverlay    │  │
│  │ (upload)  │   │ (preview)    │   │ (adjust corners)    │  │
│  └──────────┘   └──────────────┘   └─────────┬───────────┘  │
│                                                │              │
│                                    ┌───────────▼───────────┐ │
│                                    │  @imgly/bg-removal    │ │
│                                    │  (WASM, client-side)  │ │
│                                    └───────────┬───────────┘ │
│                                                │              │
│  ┌──────────────┐   ┌──────────┐   ┌──────────▼──────────┐  │
│  │ DownloadBar   │◄──│ Compare  │◄──│ ResultPanel         │  │
│  │ (PNG/JPG/SVG) │   │ Slider   │   │ (checkerboard bg)   │  │
│  └──────────────┘   └──────────┘   └─────────────────────┘  │
└───────────────┬────────────────────────────┬─────────────────┘
                │                            │
        ┌───────▼───────┐           ┌────────▼────────┐
        │ POST           │           │ POST             │
        │ /api/extract   │           │ /api/process     │
        │                │           │                  │
        │ Gemini 2.5 Pro │           │ Sharp pipeline   │
        │ Vision API     │           │ crop → correct   │
        │ → detection    │           │ → enhance        │
        └───────────────┘           └──────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| AI Vision | Google Gemini 2.5 Pro (`@google/generative-ai`) |
| Image Processing | Sharp (server) |
| Background Removal | @imgly/background-removal (WASM, client) |
| State Management | Zustand |
| Animations | Framer Motion |
| Validation | Zod + @t3-oss/env-nextjs |
| File Upload | react-dropzone |

## Setup

### 1. Clone

```bash
git clone https://github.com/your-username/TaaToIbo.git
cd TaaToIbo
```

### 2. Install

```bash
npm install
```

### 3. Configure

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Gemini API key:

```env
GEMINI_API_KEY=your_key_here
```

Get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 4. Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Build

```bash
npm run build
npm start
```

## API Endpoints

### `POST /api/extract`

Send a garment image for AI-powered print detection.

- **Input:** `multipart/form-data` with `image` field (JPEG/PNG/WEBP, max 10MB)
- **Output:** Detection result with bounding box, perspective points, confidence, garment type, dominant colors

### `POST /api/process`

Crop, perspective-correct, and enhance the detected print region.

- **Input:** JSON with `imageBase64`, `detection`, and optional `adjustedPoints`
- **Output:** Processed PNG (base64), dimensions, color palette

## How Gemini 2.5 Pro is Used

TaaToIbo sends garment photos to Gemini 2.5 Pro Vision via Next.js API routes (server-side only — the API key never reaches the client). The model receives a specialized system prompt that instructs it to:

1. Identify the garment type (t-shirt, hoodie, jacket)
2. Locate the printed graphic region
3. Return normalized bounding box and perspective corner coordinates
4. Assess fabric distortion level
5. Recommend the best extraction approach

The response is validated with Zod schemas before use. Rate limiting (10 req/min) and retry logic with exponential backoff protect against API limits.

## Deployment (Vercel)

```bash
npm i -g vercel
vercel deploy
```

Set `GEMINI_API_KEY` in Vercel → Settings → Environment Variables.

The included `vercel.json` configures 60s timeout and 1024MB memory for API routes.

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── extract/route.ts    # Gemini detection endpoint
│   │   └── process/route.ts    # Sharp processing endpoint
│   ├── globals.css             # Design system
│   ├── layout.tsx              # Root layout (dark mode, fonts)
│   └── page.tsx                # Main SPA page
├── components/
│   ├── layout/                 # Header, Footer, StepIndicator
│   ├── upload/                 # DropZone, ImagePreview
│   ├── canvas/                 # SelectionOverlay
│   ├── results/                # CompareSlider, ResultPanel, DownloadBar
│   └── ui/                     # shadcn components
├── hooks/
│   ├── useExtraction.ts        # AI pipeline orchestration
│   └── useDownload.ts          # Export (PNG/JPG/SVG)
├── lib/
│   ├── gemini.ts               # Gemini 2.5 Pro client
│   ├── imageProcessor.ts       # Sharp pipeline
│   ├── backgroundRemoval.ts    # WASM bg removal
│   ├── validators.ts           # Zod schemas
│   ├── env.ts                  # Env validation
│   └── utils.ts                # Utilities
├── store/
│   └── useAppStore.ts          # Zustand state
├── types/
│   └── index.ts                # All TypeScript interfaces
├── middleware.ts               # Rate limiting
├── vercel.json                 # Deployment config
└── .env.local.example          # Env template
```

## License

MIT

---

# TaaToIbo (Türkçe)

**Tekstil Sanatı ve Giyim → İzole Edilmiş Arka Plansız Nesne**

Kıyafet fotoğraflarından basılı grafik tasarımlarını çıkaran bir web uygulaması. Bir tişört, kapüşonlu veya ceket fotoğrafı yükleyin — TaaToIbo, yapay zeka (Nano Banana Pro AI) kullanarak baskıyı algılar, kumaşı kaldırır ve izole edilmiş düz tasarımı sunar.

---

## Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                        Tarayıcı (İstemci)                    │
│                                                               │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│  │ DropZone  │──→│ ImagePreview │──→│ SelectionOverlay    │  │
│  │ (yükleme) │   │ (önizleme)   │   │ (köşeleri ayarla)   │  │
│  └──────────┘   └──────────────┘   └─────────┬───────────┘  │
│                                                │              │
│                                    ┌───────────▼───────────┐ │
│                                    │  @imgly/bg-removal    │ │
│                                    │  (WASM, istemci-tarafı)│ │
│                                    └───────────┬───────────┘ │
│                                                │              │
│  ┌──────────────┐   ┌──────────┐   ┌──────────▼──────────┐  │
│  │ DownloadBar   │◄──│ Compare  │◄──│ ResultPanel         │  │
│  │ (PNG/JPG/SVG) │   │ Slider   │   │ (damalı arka plan)  │  │
│  └──────────────┘   └──────────┘   └─────────────────────┘  │
└───────────────┬────────────────────────────┬─────────────────┘
                │                            │
        ┌───────▼───────┐           ┌────────▼────────┐
        │ POST           │           │ POST             │
        │ /api/extract   │           │ /api/process     │
        │                │           │                  │
        │ Nano Banana Pro│           │ Sharp ardışık    │
        │ Yapay Zekası   │           │ kesim → düzelt   │
        │ → algılama     │           │ → iyileştir      │
        └───────────────┘           └──────────────────┘
```

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Çerçeve | Next.js 16 (App Router, TypeScript strict) |
| Şekillendirme | Tailwind CSS v4 + shadcn/ui |
| Yapay Zeka (Görüş) | Nano Banana Pro (`@google/generative-ai`) |
| Görüntü İşleme | Sharp (sunucu) |
| Arka Plan Kaldırma | @imgly/background-removal (WASM, istemci) |
| Durum Yönetimi | Zustand |
| Animasyonlar | Framer Motion |
| Doğrulama | Zod + @t3-oss/env-nextjs |
| Dosya Yükleme | react-dropzone |

## Kurulum

### 1. Kopyala

```bash
git clone https://github.com/your-username/TaaToIbo.git
cd TaaToIbo
```

### 2. Yükle

```bash
npm install
```

### 3. Yapılandır

```bash
cp .env.local.example .env.local
```

`.env.local` dosyasını düzenleyin ve Gemini API anahtarınızı ekleyin:

```env
GEMINI_API_KEY=api_anahtariniz_buraya
```

[Google AI Studio](https://aistudio.google.com/app/apikey) üzerinden bir anahtar alabilirsiniz.

### 4. Geliştirme

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) adresini açın.

### 5. Derleme

```bash
npm run build
npm start
```

## API Uç Noktaları

### `POST /api/extract`

Yapay zeka destekli baskı algılaması için bir kıyafet resmi gönderin.

- **Girdi:** `multipart/form-data` ile `image` alanı (JPEG/PNG/WEBP, maks 10MB)
- **Çıktı:** Sınırlayıcı kutu, perspektif noktaları, güvenilirlik, kıyafet türü, baskın renkleri içeren algılama sonucu

### `POST /api/process`

Algılanan baskı bölgesini kesin, perspektifini düzeltin ve iyileştirin.

- **Girdi:** `imageBase64`, `detection` ve isteğe bağlı `adjustedPoints` içeren JSON
- **Çıktı:** İşlenmiş PNG (base64), boyutlar, renk paleti

## Nano Banana Pro Nasıl Kullanılır

TaaToIbo, Next.js API yolları aracılığıyla (yalnızca sunucu tarafı — API anahtarı istemciye asla ulaşmaz) giysi fotoğraflarını Nano Banana Pro'ya gönderir. Model, ona şu talimatları veren özel bir sistem istemi alır:

1. Kıyafet türünü (tişört, kapüşonlu, ceket) tanımla
2. Basılı grafik bölgesini bul
3. Normalize edilmiş sınırlayıcı kutu ve perspektif köşe koordinatlarını döndür
4. Kumaş bozulma seviyesini değerlendir
5. En iyi çıkarma yaklaşımını öner

Yanıt, kullanılmadan önce Zod şemaları ile doğrulanır. Hız sınırlama (10 istek/dk) ve üstel geri çekilme (exponential backoff) mantığına sahip yeniden deneme mekanizması, API sınırlarına karşı koruma sağlar.

## Dağıtım (Vercel)

```bash
npm i -g vercel
vercel deploy
```

Vercel → Settings → Environment Variables içinde `GEMINI_API_KEY` değerini ayarlayın.

Ekteki `vercel.json` API yolları için 60sn zaman aşımı ve 1024MB bellek yapılandırır.

## Proje Yapısı

```
├── app/
│   ├── api/
│   │   ├── extract/route.ts    # Gemini algılama uç noktası
│   │   └── process/route.ts    # Sharp işleme uç noktası
│   ├── globals.css             # Tasarım sistemi
│   ├── layout.tsx              # Kök düzen (karanlık mod, yazı tipleri)
│   └── page.tsx                # Ana SPA sayfası
├── components/
│   ├── layout/                 # Üstbilgi, Altbilgi, Adım Göstergesi
│   ├── upload/                 # Yükleme Alanı, Görüntü Önizleme
│   ├── canvas/                 # Seçim Katmanı
│   ├── results/                # Karşılaştırma Kaydırıcısı, Sonuç Paneli, İndirme Çubuğu
│   └── ui/                     # shadcn bileşenleri
├── hooks/
│   ├── useExtraction.ts        # Yapay zeka boru hattı yönetimi
│   └── useDownload.ts          # Dışa aktarma (PNG/JPG/SVG)
├── lib/
│   ├── gemini.ts               # Gemini istemcisi
│   ├── imageProcessor.ts       # Sharp boru hattı
│   ├── backgroundRemoval.ts    # WASM arkaplan kaldırma
│   ├── validators.ts           # Zod şemaları
│   ├── env.ts                  # Çevre değişkenleri doğrulaması
│   └── utils.ts                # Araçlar
├── store/
│   └── useAppStore.ts          # Zustand durumu
├── types/
│   └── index.ts                # Tüm TypeScript arayüzleri
├── middleware.ts               # Hız sınırlayıcı
├── vercel.json                 # Dağıtım yapılandırması
└── .env.local.example          # Çevre değişkenleri şablonu
```

## Lisans

MIT

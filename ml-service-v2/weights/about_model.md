# Dokumentasi Teknis & Arsitektur Model: GSIVAE (best_model.pt)

Berkas bobot **`best_model.pt`** adalah checkpoint model deep learning terlatih (*pre-trained weights*) berbasis arsitektur **GSIVAE** (*Gated Skip-connected Inpainting Variational AutoEncoder*). Model ini dirancang khusus untuk memulihkan dan merekonstruksi area wajah yang terhalang penyamaran (*de-disguise reconstruction*)—terutama **kacamata hitam pekat (*heavy dark sunglasses*)**, bayangan inframerah malam, maupun oklusi lainnya—sehingga fitur biometrik mata, alis, dan pelipis dapat terbaca secara presisi oleh model pengenal wajah biometrik **InsightFace ArcFace (512-D)**.

Dokumen ini ditulis secara komprehensif bagi peneliti (*researcher*), perekayasa machine learning (*ML engineer*), maupun pengembang perangkat lunak (*software developer*) yang ingin mengunduh, memahami cara kerja matematis, dan mengintegrasikan model ini secara mandiri (*standalone*) ke dalam sistem mereka.

---

## 📌 1. Metadata Checkpoint & Spesifikasi Model

Data berikut diekstraksi langsung dari *state dictionary* dan *metadata header* berkas `best_model.pt`:

| Parameter Teknis | Nilai / Spesifikasi Aktual | Keterangan |
| :--- | :--- | :--- |
| **Nama File** | `best_model.pt` | Checkpoint bobot PyTorch resmi |
| **Ukuran File** | $\approx 251.0 \text{ MB}$ ($251,025,745 \text{ bytes}$) | Berisi `model_state_dict`, optimizer, scheduler, & config |
| **Total Parameter** | **27,598,619 parameter** ($\approx 27.6\text{ M}$) | Seluruhnya berbobot `float32` |
| **Tipe Arsitektur** | `GSIVAE` (*Gated Skip-connected VAE*) | VAE dengan Selective Gated Skip Connections |
| **Model Kind** | `vae` | Variational AutoEncoder probabilistik |
| **Epoch Pelatihan Terbaik** | **Epoch 19** | Titik konvergensi optimal |
| **Kriteria Seleksi Checkpoint** | `maximum_validation_arcface_cosine` | Dipilih berdasarkan kemiripan vektor biometrik tertinggi |
| **Best Val ArcFace Cosine** | **0.7185** ($71.85\%$) | Kemiripan identitas rata-rata pada validation set bertopeng |
| **Best Val Total Loss** | **0.25088** | Kombinasi $\mathcal{L}_1 + \text{SSIM} + \text{LPIPS} + \text{ArcFace} + \text{KL}$ |
| **Dimensi Input** | $(B, 3, 224, 224)$ | Format RGB, rentang nilai dinormalisasi $[0.0, 1.0]$ |
| **Dimensi Output** | $(B, 3, 224, 224)$ | Wajah rekonstruksi RGB bebas kacamata $[0.0, 1.0]$ |
| **Dimensi Ruang Laten ($z$)** | **256 Dimensi** | Representasi padat fitur wajah ($\mathbf{\mu}, \mathbf{\log\sigma^2}$) |
| **Base Channels ($b$)** | 32 Saluran | Pengali kanal encoder-decoder ($32 \rightarrow 64 \rightarrow 128 \rightarrow 256 \rightarrow 512$) |
| **Model Biometrik Komplementer** | InsightFace ArcFace (`w600k_r50.onnx`) | Menghasilkan vektor biometrik 512-D L2-normalized |

---

## 🏗️ 2. Arsitektur Jaringan Neural Network Terperinci

### Mengapa U-Net Konvensional Gagal pada Kacamata Hitam?
Pada arsitektur U-Net konvensional (*Standard Skip Connection*), fitur spasial dari encoder langsung digabungkan (*concatenated*) ke decoder:
$$\mathbf{X}_{\text{fused}} = [\mathbf{X}_{\text{decoder}}, \mathbf{S}_{\text{skip}}]$$
Kelemahannya, fitur kacamata hitam yang pekat pada encoder ikut disalin mentah-mentah ke decoder, menyebabkan hasil rekonstruksi tetap meninggalkan noda hitam kacamata (*leakage*).

### Solusi GSIVAE: Gated Skip-Connection (Mekanisme Gerbang Selektif)
GSIVAE menambahkan sub-jaringan gerbang konvolusional $1\times 1$ dengan fungsi aktivasi Sigmoid ($\sigma$) yang mempelajari **atensi spasial oklusi**:
$$\mathbf{G} = \sigma\left(\mathbf{W}_g * [\mathbf{X}_{\text{upsample}}, \mathbf{S}_{\text{skip}}] + \mathbf{b}_g\right) \quad \in [0.0, 1.0]$$
$$\mathbf{S}_{\text{gated}} = \mathbf{S}_{\text{skip}} \odot \mathbf{G}$$

- Pada area **kacamata hitam / masker**: Nilai gerbang $\mathbf{G} \to 0.0$, sehingga informasi oklusi diblokir total dan decoder dipaksa mengimputasi mata berdasarkan ruang laten $z$ (informasi prior distribusi wajah manusia).
- Pada area **kulit asli / hidung / mulut / dahi**: Nilai gerbang $\mathbf{G} \to 1.0$, sehingga detail tekstur asli wajah dipertahankan secara tajam tanpa kehilangan resolusi.

---

### Diagram Alur Data & Komposisi Lapisan

```
                           DIAGRAM ARSITEKTUR GSIVAE
                           
   Citra Input (Wajah Berpenyamar)
        [ B x 3 x 224 x 224 ]
                 │
                 ▼
   ┌───────────────────────────┐
   │ enc1 (ResidualDownBlock)  │ ──(Skip s1: 32 x 112 x 112)──────────────────┐
   └───────────────────────────┘                                              │
                 │                                                            │
                 ▼                                                            │
   ┌───────────────────────────┐                                              │
   │ enc2 (ResidualDownBlock)  │ ──(Skip s2: 64 x 56 x 56)──────────┐         │
   └───────────────────────────┘                                     │         │
                 │                                                   │         │
                 ▼                                                   │         │
   ┌───────────────────────────┐                                     │         │
   │ enc3 (ResidualDownBlock)  │ ──(Skip s3: 128 x 28 x 28)──┐       │         │
   └───────────────────────────┘                             │       │         │
                 │                                           │       │         │
                 ▼                                           │       │         │
   ┌───────────────────────────┐                             │       │         │
   │ enc4 (ResidualDownBlock)  │ ──(Skip s4: 256 x 14 x 14)─┐│       │         │
   └───────────────────────────┘                            ││       │         │
                 │                                          ││       │         │
                 ▼                                          ││       │         │
   ┌───────────────────────────┐                            ││       │         │
   │ enc5 (ResidualDownBlock)  │ (512 x 7 x 7 = 25,088)     ││       │         │
   └───────────────────────────┘                            ││       │         │
                 │                                          ││       │         │
                 ▼                                          ││       │         │
     [ Flatten ke 25,088 ]                                  ││       │         │
        ┌────────┴────────┐                                 ││       │         │
        ▼                 ▼                                 ││       │         │
   ┌─────────┐       ┌───────────┐                          ││       │         │
   │  fc_mu  │       │ fc_logvar │                          ││       │         │
   └─────────┘       └───────────┘                          ││       │         │
        │                 │                                 ││       │         │
        ▼                 ▼                                 ││       │         │
   [ Latent z (Inference: z = mu, Dim: 256) ]               ││       │         │
                 │                                          ││       │         │
                 ▼                                          ││       │         │
   ┌───────────────────────────┐                            ││       │         │
   │ fc_decode (Linear 25088)  │ (Reshape: 512 x 7 x 7)     ││       │         │
   └───────────────────────────┘                            ││       │         │
                 │                                          ││       │         │
                 ▼                                          ▼▼       │         │
   ┌───────────────────────────┐                                     │         │
   │ dec4 (GatedFuseBlock)     │ ◄── Gated Skip Fusion (s4: 256)     │         │
   │ Output: 256 x 14 x 14     │                                     │         │
   └───────────────────────────┘                                     ▼         │
                 │                                                             │
                 ▼                                                             │
   ┌───────────────────────────┐                                               │
   │ dec3 (GatedFuseBlock)     │ ◄── Gated Skip Fusion (s3: 128)               │
   │ Output: 128 x 28 x 28     │                                               │
   └───────────────────────────┘                                               │
                 │                                                             │
                 ▼                                                             │
   ┌───────────────────────────┐                                               │
   │ dec2 (GatedFuseBlock)     │ ◄── Gated Skip Fusion (s2: 64)                │
   │ Output: 64 x 56 x 56      │                                               │
   └───────────────────────────┘                                               │
                 │                                                             │
                 ▼                                                             ▼
   ┌───────────────────────────┐                                               
   │ dec1 (GatedFuseBlock)     │ ◄── Gated Skip Fusion (s1: 32) ───────────────┘
   │ Output: 32 x 112 x 112    │
   └───────────────────────────┘
                 │
                 ▼
   ┌───────────────────────────┐
   │ final (Upsample + Convs)  │ ──► Sigmoid Activation
   └───────────────────────────┘
                 │
                 ▼
   Citra Output Rekonstruksi Wajah Asli
        [ B x 3 x 224 x 224 ]
```

---

### Tabel Aliran Dimensi Tensor (Tensor Shapes Progression)

| Lapisan / Blok | Operasi / Modul | Dimensi Input Tensor | Dimensi Output Tensor | Skip Output |
| :--- | :--- | :--- | :--- | :--- |
| **Input** | Normalisasi Gambar $[0, 1]$ | $(B, 3, 224, 224)$ | $(B, 3, 224, 224)$ | - |
| **`enc1`** | Residual Conv $3\times 3$, Stride 2 | $(B, 3, 224, 224)$ | $(B, 32, 112, 112)$ | $\mathbf{s}_1$ $(B, 32, 112, 112)$ |
| **`enc2`** | Residual Conv $3\times 3$, Stride 2 | $(B, 32, 112, 112)$ | $(B, 64, 56, 56)$ | $\mathbf{s}_2$ $(B, 64, 56, 56)$ |
| **`enc3`** | Residual Conv $3\times 3$, Stride 2 | $(B, 64, 56, 56)$ | $(B, 128, 28, 28)$ | $\mathbf{s}_3$ $(B, 128, 28, 28)$ |
| **`enc4`** | Residual Conv $3\times 3$, Stride 2 | $(B, 128, 28, 28)$ | $(B, 256, 14, 14)$ | $\mathbf{s}_4$ $(B, 256, 14, 14)$ |
| **`enc5`** | Residual Conv $3\times 3$, Stride 2 | $(B, 256, 14, 14)$ | $(B, 512, 7, 7)$ | - |
| **Flatten** | Reshape ke 1D | $(B, 512, 7, 7)$ | $(B, 25088)$ | - |
| **`fc_mu`** | Linear Layer Projection | $(B, 25088)$ | $(B, 256)$ | $\mathbf{\mu}$ |
| **`fc_logvar`** | Linear Layer Projection | $(B, 25088)$ | $(B, 256)$ | $\mathbf{\log\sigma^2}$ |
| **Bottleneck $z$** | Sampling / Mean Mode | $(B, 256)$ | $(B, 256)$ | $\mathbf{z}$ |
| **`fc_decode`** | Linear Layer + Reshape | $(B, 256)$ | $(B, 512, 7, 7)$ | - |
| **`dec4`** | Gated Fuse $(512 + \mathbf{s}_4 \to 256)$ | $(B, 512, 7, 7)$ & $\mathbf{s}_4$ | $(B, 256, 14, 14)$ | - |
| **`dec3`** | Gated Fuse $(256 + \mathbf{s}_3 \to 128)$ | $(B, 256, 14, 14)$ & $\mathbf{s}_3$ | $(B, 128, 28, 28)$ | - |
| **`dec2`** | Gated Fuse $(128 + \mathbf{s}_2 \to 64)$ | $(B, 128, 28, 28)$ & $\mathbf{s}_2$ | $(B, 64, 56, 56)$ | - |
| **`dec1`** | Gated Fuse $(64 + \mathbf{s}_1 \to 32)$ | $(B, 64, 56, 56)$ & $\mathbf{s}_1$ | $(B, 32, 112, 112)$ | - |
| **`final`** | Bilinear $(224 \times 224) + \text{Conv}_{3\times 3} + \text{Sigmoid}$ | $(B, 32, 112, 112)$ | $(B, 3, 224, 224)$ | Output Citra Rekonstruksi |

---

## 🎯 3. Formulasi Objektif Pelatihan (Loss Function)

Model dilatih menggunakan fungsi objektif gabungan (*Composite Multi-Task Loss*) yang menjaga keseimbangan antara kesamaan piksel, struktur visual, keteraturan ruang laten, dan keterbacaan identitas oleh ArcFace:

$$\mathcal{L}_{\text{total}} = \lambda_{\text{L1}} \mathcal{L}_{\text{L1}} + \lambda_{\text{SSIM}} \mathcal{L}_{\text{SSIM}} + \lambda_{\text{perc}} \mathcal{L}_{\text{perceptual}} + \lambda_{\text{id}} \mathcal{L}_{\text{identity}} + \beta \mathcal{L}_{\text{KL}}$$

Dengan parameter bobot konfigurasi pelatihan:
- $\lambda_{\text{L1}} = 1.0$: Kesetiaan nilai piksel absolut (*Mean Absolute Error*).
- $\lambda_{\text{SSIM}} = 0.2$: Structural Similarity Index untuk menjaga kontur wajah dan luminansi.
- $\lambda_{\text{perc}} = 0.1$: Learned Perceptual Image Patch Similarity (LPIPS VGG) agar citra tidak buram.
- $\lambda_{\text{id}} = 0.1$: **ArcFace Biometric Cosine Loss**, dirumuskan sebagai:
  $$\mathcal{L}_{\text{identity}} = 1.0 - \frac{\text{ArcFace}(\hat{\mathbf{x}}) \cdot \text{ArcFace}(\mathbf{x}_{\text{gt}})}{\|\text{ArcFace}(\hat{\mathbf{x}})\|_2 \|\text{ArcFace}(\mathbf{x}_{\text{gt}})\|_2}$$
  Memaksa fitur wajah yang direkonstruksi memiliki vektor biometrik yang sedekat mungkin dengan wajah asli target tanpa kacamata.
- $\beta = 0.0001$: Bobot divergensi Kullback-Leibler (*KL Warmup* bertahap selama 10 epoch) untuk mencegah *posterior collapse*:
  $$\mathcal{L}_{\text{KL}} = -\frac{1}{2} \sum_{j=1}^{256} \left( 1 + \log\sigma_j^2 - \mu_j^2 - \exp(\log\sigma_j^2) \right)$$

---

## 💻 4. Kode Drop-in Standalone (Siap Pakai Tanpa Dependensi Framework Luar)

Berikut adalah kode Python murni (*PyTorch standalone script*) yang dapat langsung Anda salin dan jalankan di lingkungan manapun hanya dengan `torch`, `torchvision`, `Pillow`, dan `numpy`:

```python
import torch
from torch import nn, Tensor
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import numpy as np

# =====================================================================
# 1. BLOK ENCODER RESIDUAL
# =====================================================================
class ResidualDownBlock(nn.Module):
    """
    Blok konvolusi downsampling dengan residual connection (1x1 conv)
    dan normalisasi BatchNorm2d + SiLU.
    """
    def __init__(self, in_ch: int, out_ch: int):
        super().__init__()
        self.main = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, kernel_size=3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.SiLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
        )
        self.skip = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, kernel_size=1, stride=2, bias=False),
            nn.BatchNorm2d(out_ch)
        )
        self.act = nn.SiLU(inplace=True)

    def forward(self, x: Tensor) -> Tensor:
        return self.act(self.main(x) + self.skip(x))


# =====================================================================
# 2. BLOK DECODER GATED SKIP FUSION (INNOVATION CORE)
# =====================================================================
class GatedDecoderFuseBlock(nn.Module):
    """
    Blok decoder dengan mekanisme gerbang (Gate Attention 1x1 Conv + Sigmoid)
    untuk memfilter fitur kacamata hitam dari encoder sebelum penggabungan.
    """
    def __init__(self, in_ch: int, skip_ch: int, out_ch: int):
        super().__init__()
        # Gerbang perhatian spasial
        self.gate = nn.Sequential(
            nn.Conv2d(in_ch + skip_ch, skip_ch, kernel_size=1, bias=True),
            nn.Sigmoid()
        )
        # Konvolusi sintesis wajah
        self.conv = nn.Sequential(
            nn.Conv2d(in_ch + skip_ch, out_ch, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.SiLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.SiLU(inplace=True),
        )

    def forward(self, x: Tensor, skip: Tensor) -> Tensor:
        # Upsample fitur decoder ke ukuran spasial skip tensor
        x = F.interpolate(x, size=skip.shape[-2:], mode='bilinear', align_corners=False)
        cat_feat = torch.cat([x, skip], dim=1)
        
        # Hitung mask gerbang selektif [0.0, 1.0]
        g = self.gate(cat_feat)
        gated_skip = skip * g
        
        # Gabungkan fitur yang telah difilter
        return self.conv(torch.cat([x, gated_skip], dim=1))


# =====================================================================
# 3. KELAS UTAMA ARSITEKTUR GSIVAE
# =====================================================================
class GSIVAE(nn.Module):
    def __init__(self, image_size: int = 224, latent_dim: int = 256, base_channels: int = 32):
        super().__init__()
        self.image_size = image_size
        self.latent_dim = latent_dim
        b = base_channels
        
        # Encoder (5 tahapan downsampling: 224 -> 112 -> 56 -> 28 -> 14 -> 7)
        self.enc1 = ResidualDownBlock(3, b)        # 32
        self.enc2 = ResidualDownBlock(b, b * 2)    # 64
        self.enc3 = ResidualDownBlock(b * 2, b * 4)  # 128
        self.enc4 = ResidualDownBlock(b * 4, b * 8)  # 256
        self.enc5 = ResidualDownBlock(b * 8, b * 16) # 512
        
        self.flatten_dim = b * 16 * 7 * 7  # 512 * 7 * 7 = 25,088
        
        # Variational Latent Projections
        self.fc_mu = nn.Linear(self.flatten_dim, latent_dim)
        self.fc_logvar = nn.Linear(self.flatten_dim, latent_dim)
        
        # Decoder Expansion
        self.fc_decode = nn.Linear(latent_dim, self.flatten_dim)
        
        # Gated Decoder Stages (Upsampling bertahap: 7 -> 14 -> 28 -> 56 -> 112)
        self.dec4 = GatedDecoderFuseBlock(b * 16, b * 8, b * 8)
        self.dec3 = GatedDecoderFuseBlock(b * 8, b * 4, b * 4)
        self.dec2 = GatedDecoderFuseBlock(b * 4, b * 2, b * 2)
        self.dec1 = GatedDecoderFuseBlock(b * 2, b, b)
        
        # Final Output Reconstruction (112 -> 224 RGB)
        self.final = nn.Sequential(
            nn.Upsample(size=(image_size, image_size), mode='bilinear', align_corners=False),
            nn.Conv2d(b, b, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(b),
            nn.SiLU(inplace=True),
            nn.Conv2d(b, 3, kernel_size=3, padding=1),
            nn.Sigmoid(),  # Memastikan rentang piksel persis [0.0, 1.0]
        )

    def encode(self, x: Tensor):
        s1 = self.enc1(x)
        s2 = self.enc2(s1)
        s3 = self.enc3(s2)
        s4 = self.enc4(s3)
        feat_map = self.enc5(s4)
        
        flat = feat_map.flatten(1)
        mu = self.fc_mu(flat)
        logvar = torch.clamp(self.fc_logvar(flat), -10.0, 4.0)
        return mu, logvar, (s1, s2, s3, s4)

    def decode(self, z: Tensor, skips):
        s1, s2, s3, s4 = skips
        x = self.fc_decode(z).view(z.shape[0], 512, 7, 7)
        x = self.dec4(x, s4)
        x = self.dec3(x, s3)
        x = self.dec2(x, s2)
        x = self.dec1(x, s1)
        return self.final(x)

    def forward(self, x: Tensor):
        mu, logvar, skips = self.encode(x)
        # Pada evaluasi/inferensi biometrik, gunakan mu secara deterministik
        recon = self.decode(mu, skips)
        return recon, mu, logvar


# =====================================================================
# 4. FUNGSI PEMUATAN BOBOT & INFERENSI GAMBAR
# =====================================================================
def load_gsivae_model(checkpoint_path: str = "best_model.pt", device: str = "cuda" if torch.cuda.is_available() else "cpu"):
    """
    Memuat model GSIVAE dari checkpoint PyTorch dengan validasi strict.
    """
    device = torch.device(device)
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    cfg = checkpoint.get("model_config", {})
    
    model = GSIVAE(
        image_size=cfg.get("image_size", 224),
        latent_dim=cfg.get("latent_dim", 256),
        base_channels=cfg.get("base_channels", 32)
    )
    
    # Load state dict dengan verifikasi kecocokan layer 100%
    model.load_state_dict(checkpoint["model_state_dict"], strict=True)
    model.to(device).eval()
    print(f"✅ Model GSIVAE berhasil dimuat ({sum(p.numel() for p in model.parameters()):,} parameter) pada {device}.")
    return model


def reconstruct_cctv_crop(model: GSIVAE, input_image_path: str, device: str = "cpu") -> Image.Image:
    """
    Melakukan rekonstruksi wajah bertopeng kacamata hitam menjadi wajah asli.
    """
    pil_img = Image.open(input_image_path).convert("RGB")
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),  # Mengubah rentang ke [0.0, 1.0]
    ])
    tensor_input = transform(pil_img).unsqueeze(0).to(device)
    
    with torch.inference_mode():
        recon_tensor, _, _ = model(tensor_input)
        recon_tensor = recon_tensor.clamp(0.0, 1.0)
        
    arr = recon_tensor[0].detach().cpu().permute(1, 2, 0).numpy()
    uint8_img = np.clip(arr * 255.0, 0, 255).round().astype(np.uint8)
    return Image.fromarray(uint8_img, mode="RGB")


# =====================================================================
# CONTOH PENGGUNAAN MANDIRI:
# =====================================================================
if __name__ == "__main__":
    device = "cuda" if torch.cuda.is_available() else "cpu"
    # 1. Muat model
    gsivae = load_gsivae_model("best_model.pt", device=device)
    
    # 2. Lakukan de-disguise pada crop wajah CCTV bertopeng
    # hasil_wajah = reconstruct_cctv_crop(gsivae, "crop_sunglasses_cctv.jpg", device=device)
    # hasil_wajah.save("hasil_wajah_tanpa_kacamata.jpg")
    print("Contoh eksekusi berhasil didefinisikan.")
```

---

## 🔗 5. Alur Integrasi Biometrik Hilir (InsightFace ArcFace Integration)

Setelah citra direkonstruksi oleh GSIVAE, citra wajah harus diumpankan ke model ekstraksi biometrik **ArcFace** (`w600k_r50.onnx`) untuk mendapatkan vektor identitas 512-D:

```
[ Crop CCTV Berpenyamar ]
         │
         ▼
 ┌───────────────┐
 │ GSIVAE (224)  │ ──► Rekonstruksi Wajah Asli Bebas Kacamata
 └───────────────┘
         │
         ▼
 [ Resize ke 112 x 112 & Format BGR ]
         │
         ▼
 ┌───────────────┐
 │ Normalisasi   │ ──► Formula: (pixel - 127.5) / 127.5
 └───────────────┘
         │
         ▼
 ┌───────────────────────┐
 │ ArcFace (ResNet-50)   │ ──► InsightFace w600k_r50.onnx
 └───────────────────────┘
         │
         ▼
 [ Vektor Biometrik (512-D) ] ──► L2-Normalization (||v|| = 1.0)
         │
         ▼
 [ Cosine Similarity Match ] ──► Bandingkan dengan Foto Profil Database (Tanpa Penyamaran)
```

### Ambang Batas Operasional (Threshold Recommendations)

| Kasus Penggunaan (*Scenario*) | Ambang Batas ($\tau$) | Interpretasi Lapangan |
| :--- | :--- | :--- |
| **Penyamaran Kacamata Hitam (GSIVAE)** | **$\tau = 0.288$** | **Standar Resmi Disguise-ID** (Mengakomodasi rekonstruksi sintetis & variasi sudut CCTV). |
| **Penyamaran Kacamata Hitam (Operasional)**| **$\tau = 0.300$** | **Optimal Lapangan Seimbang** (Akurasi tinggi dengan FAR $\approx 0.1\%$). |
| **Wajah Normal Tanpa Penyamaran** | **$\tau = 0.450 - 0.550$** | Standar verifikasi identitas ArcFace wajah tanpa oklusi. |

---

## 📄 6. Kutipan & Hak Cipta (*Citation*)

Jika Anda memanfaatkan bobot `best_model.pt` atau arsitektur GSIVAE dalam penelitian ilmiah, silakan mengutip format berikut:

```bibtex
@article{disguise_id_gsivae_2026,
  title   = {GSIVAE: Gated Skip-Connected Inpainting Variational Autoencoder for Disguise-Resilient Face Identification Under Surveillance Constraints},
  author  = {Disguise-ID Research Team},
  journal = {Machine Learning and Computer Vision Engineering},
  year    = {2026}
}
```

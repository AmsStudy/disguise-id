from __future__ import annotations
from dataclasses import dataclass
import torch
from torch import Tensor, nn
import torch.nn.functional as F

@dataclass
class SkipAEConfig:
    image_size: int = 224
    latent_dim: int = 256
    base_channels: int = 32

class ResidualDownBlock(nn.Module):
    def __init__(self, in_ch: int, out_ch: int):
        super().__init__()
        self.main = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, 2, 1, bias=False), nn.BatchNorm2d(out_ch), nn.SiLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, 1, 1, bias=False), nn.BatchNorm2d(out_ch),
        )
        self.skip = nn.Sequential(nn.Conv2d(in_ch, out_ch, 1, 2, bias=False), nn.BatchNorm2d(out_ch))
        self.act = nn.SiLU(inplace=True)
    def forward(self, x: Tensor) -> Tensor:
        return self.act(self.main(x) + self.skip(x))

class DecoderFuseBlock(nn.Module):
    def __init__(self, in_ch: int, skip_ch: int, out_ch: int):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(in_ch + skip_ch, out_ch, 3, padding=1, bias=False), nn.BatchNorm2d(out_ch), nn.SiLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False), nn.BatchNorm2d(out_ch), nn.SiLU(inplace=True),
        )
    def forward(self, x: Tensor, skip: Tensor) -> Tensor:
        x = F.interpolate(x, size=skip.shape[-2:], mode='bilinear', align_corners=False)
        return self.conv(torch.cat([x, skip], dim=1))

class SkipConnectedAutoencoder(nn.Module):
    def __init__(self, config: SkipAEConfig):
        super().__init__()
        self.config = config
        b = config.base_channels
        self.enc1 = ResidualDownBlock(3, b)
        self.enc2 = ResidualDownBlock(b, b*2)
        self.enc3 = ResidualDownBlock(b*2, b*4)
        self.enc4 = ResidualDownBlock(b*4, b*8)
        self.enc5 = ResidualDownBlock(b*8, b*16)
        self.flatten_dim = b*16*7*7
        self.fc_latent = nn.Linear(self.flatten_dim, config.latent_dim)
        self.fc_decode = nn.Linear(config.latent_dim, self.flatten_dim)
        self.dec4 = DecoderFuseBlock(b*16, b*8, b*8)
        self.dec3 = DecoderFuseBlock(b*8, b*4, b*4)
        self.dec2 = DecoderFuseBlock(b*4, b*2, b*2)
        self.dec1 = DecoderFuseBlock(b*2, b, b)
        self.final = nn.Sequential(
            nn.Upsample(size=(config.image_size, config.image_size), mode='bilinear', align_corners=False),
            nn.Conv2d(b, b, 3, padding=1, bias=False), nn.BatchNorm2d(b), nn.SiLU(inplace=True),
            nn.Conv2d(b, 3, 3, padding=1), nn.Sigmoid(),
        )
    def encode(self, x: Tensor):
        s1=self.enc1(x); s2=self.enc2(s1); s3=self.enc3(s2); s4=self.enc4(s3); b=self.enc5(s4)
        z=self.fc_latent(b.flatten(1)); return z,(s1,s2,s3,s4)
    def decode(self, z: Tensor, skips):
        s1,s2,s3,s4=skips
        x=self.fc_decode(z).view(z.shape[0], self.config.base_channels*16, 7, 7)
        x=self.dec4(x,s4); x=self.dec3(x,s3); x=self.dec2(x,s2); x=self.dec1(x,s1)
        return self.final(x)
    def forward(self,x:Tensor):
        z,skips=self.encode(x); return self.decode(z,skips),z

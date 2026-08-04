import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import numpy as np
import traceback

original_transpose = np.transpose

def custom_transpose(a, axes=None):
    try:
        return original_transpose(a, axes)
    except Exception as e:
        if isinstance(a, np.ndarray) and a.shape == (1280, 256):
            print(f"FAILED TRANSPOSE! a.shape={a.shape}, axes={axes}")
            traceback.print_stack()
        raise e

np.transpose = custom_transpose

import tensorflow as tf
from main import DisguiseVAE, IMAGE_SIZE

print("Building model...")
model = DisguiseVAE()
model(tf.zeros((1,) + IMAGE_SIZE))

try:
    model.load_weights("models/vae_best_identity.h5", by_name=True, skip_mismatch=True)
except Exception as e:
    pass

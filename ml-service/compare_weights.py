import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import h5py
import tensorflow as tf
from main import DisguiseVAE, IMAGE_SIZE

print("Building model...")
model = DisguiseVAE()
model(tf.zeros((1,) + IMAGE_SIZE))
print("Model built.")

print("Collecting model weights...")
model_weights = {}
for w in model.weights:
    model_weights[w.name] = w.shape

print("Collecting h5 weights...")
h5_weights = {}
def collect_h5_weights(name, obj):
    if isinstance(obj, h5py.Dataset):
        h5_weights[name] = obj.shape

with h5py.File("models/vae_best_identity.h5", 'r') as f:
    f.visititems(collect_h5_weights)

print("\n--- COMPARING ---")
for w_name, w_shape in model_weights.items():
    # Convert Keras weight name to H5 dataset name
    # e.g., 'encoder/shared_dense/kernel:0' -> 'encoder/shared_dense/shared_dense/kernel:0' 
    # Keras h5 format is weird, it's usually layer_name/layer_name/weight_name
    # Let's just do a fuzzy match based on the last two parts
    parts = w_name.split('/')
    if len(parts) >= 2:
        layer_name = parts[-2]
        weight_name = parts[-1]
        
        # find matching h5 weight
        matched = False
        for h5_key, h5_shape in h5_weights.items():
            if layer_name in h5_key and weight_name in h5_key:
                if w_shape != h5_shape:
                    print(f"MISMATCH! Model expects {w_shape} for {w_name}, but H5 has {h5_shape} at {h5_key}")
                matched = True
        
        if not matched:
            print(f"MISSING in H5: {w_name} {w_shape}")
    else:
        print(f"Could not parse: {w_name}")

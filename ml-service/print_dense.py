import h5py

def print_structure(name, obj):
    if isinstance(obj, h5py.Dataset) and 'dense' in name.lower():
        print(f"Dataset: {name}, shape={obj.shape}")

with h5py.File('models/vae_best_identity.h5', 'r') as f:
    f.visititems(print_structure)

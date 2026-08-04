import h5py

try:
    with h5py.File('models/vae_best_identity.weights.h5', 'r') as f:
        print("Keys in H5:", list(f.keys()))
        if 'model_config' in f.keys():
            print("This is a FULL MODEL (architecture + weights).")
        elif 'layer_names' in f.keys():
            print("This is a legacy Keras 2 Weights file.")
        elif 'vars' in f.keys():
            print("This is a Keras 3 Weights file.")
        else:
            print("Unknown H5 structure.")
except Exception as e:
    print("Error:", e)

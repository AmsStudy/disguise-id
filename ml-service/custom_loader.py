import h5py
import tensorflow as tf

def load_weights_by_exact_name(model, h5_path):
    print(f"Loading weights from {h5_path} exactly by name...")
    with h5py.File(h5_path, 'r') as f:
        # Build a flat dictionary of all datasets in the H5 file
        h5_weights = {}
        def collect(name, obj):
            if isinstance(obj, h5py.Dataset):
                # The name looks like encoder/shared_dense/shared_dense/kernel:0
                # or encoder/block_1_conv/kernel:0
                # Let's map the base name
                h5_weights[name] = obj
        f.visititems(collect)
        
        # Iterate through all weights in the model
        success_count = 0
        missing_count = 0
        mismatch_count = 0
        
        for w in model.weights:
            w_name = w.name # e.g. encoder/shared_dense/kernel:0
            
            # Try to find a matching key in h5_weights
            # The h5 file stores things in weird groups. Let's do a substring search.
            # E.g. for "encoder/shared_dense/kernel:0", we look for a key ending in "shared_dense/kernel:0"
            parts = w_name.split('/')
            if len(parts) >= 2:
                search_key = f"{parts[-2]}/{parts[-1]}"
            else:
                search_key = parts[-1]
                
            matched_key = None
            for h5_k in h5_weights.keys():
                if h5_k.endswith(search_key) or h5_k.endswith(w_name):
                    matched_key = h5_k
                    break
                    
            if matched_key:
                h5_data = h5_weights[matched_key][:]
                if h5_data.shape == w.shape:
                    w.assign(h5_data)
                    success_count += 1
                else:
                    # In Keras, sometimes Conv2D kernels need to be transposed if they were saved differently
                    # But usually if the shape is completely different, we skip
                    print(f"Shape mismatch for {w_name}: model={w.shape}, h5={h5_data.shape} ({matched_key})")
                    mismatch_count += 1
            else:
                print(f"Missing in H5: {w_name}")
                missing_count += 1
                
        print(f"Done. Success: {success_count}, Mismatched: {mismatch_count}, Missing: {missing_count}")

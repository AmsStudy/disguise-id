import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import traceback
import tensorflow as tf
from main import DisguiseVAE, IMAGE_SIZE

print("Building model...")
model = DisguiseVAE()
model(tf.zeros((1,) + IMAGE_SIZE))

original_set_weights = tf.keras.layers.Layer.set_weights

def custom_set_weights(self, weights):
    try:
        original_set_weights(self, weights)
    except Exception as e:
        print(f"\n[FAILED ON LAYER]: {self.name}")
        expected_shapes = [w.shape for w in self.get_weights()]
        actual_shapes = [w.shape for w in weights]
        print(f"  Expected shapes: {expected_shapes}")
        print(f"  Actual shapes:   {actual_shapes}")
        raise e

tf.keras.layers.Layer.set_weights = custom_set_weights

try:
    print("Loading weights...")
    model.load_weights("models/vae_best_identity.h5", by_name=True, skip_mismatch=True)
except Exception as e:
    print("Caught the error.")

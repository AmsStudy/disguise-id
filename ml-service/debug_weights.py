import tensorflow as tf
from model_vae import DisguiseVAE
import h5py

model = DisguiseVAE()
dummy_input = tf.random.uniform((1, 224, 224, 3))
model(dummy_input)

f = h5py.File('models/vae_best_identity.h5', 'r')

print("Starting to load weights...")
try:
    model.load_weights('models/vae_best_identity.h5', by_name=True)
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()


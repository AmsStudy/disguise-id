import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import traceback
import tensorflow as tf
from main import DisguiseVAE, IMAGE_SIZE

try:
    print("Building model...")
    model = DisguiseVAE()
    model(tf.zeros((1,) + IMAGE_SIZE))
    print("Loading weights...")
    model.load_weights("models/vae_best_identity.h5")
    print("SUCCESS!")
except Exception as e:
    print("ERROR CAUGHT:")
    traceback.print_exc()

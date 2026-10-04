import numpy as np
import openvino as ov

# Initialize OpenVINO Core
core = ov.Core()

print("OpenVINO successfully loaded!")
print("Available compute hardware:", core.available_devices)

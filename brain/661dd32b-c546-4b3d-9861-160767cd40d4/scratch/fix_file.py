import sys

path = r'd:\Projects\RentCarApp\frontend\src\views\ComptabiliteView.vue'
try:
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # The corrupted lines are 966, 967, 968 (1-indexed)
    # Which are indices 965, 966, 967
    
    # Let's double check the content at these indices
    print(f"Line 966: {repr(lines[965])}")
    print(f"Line 967: {repr(lines[966])}")
    print(f"Line 968: {repr(lines[967])}")

    # Remove them
    del lines[965:968]

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Successfully fixed the file.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

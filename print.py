import serial

# Configure the serial port with COM9, matching the PRJ-58D specifications.
# Note: Common settings for these printers are 9600 baud rate, 8 data bits, no parity, 1 stop bit
ser = serial.Serial(
    port='COM9',  # Update this to match the COM port shown in Device Manager
    baudrate=9600,  # Check your printer’s manual in case this is different
    bytesize=serial.EIGHTBITS,
    parity=serial.PARITY_NONE,
    stopbits=serial.STOPBITS_ONE,
    timeout=1
)

# ESC/POS commands for basic receipt printing
def print_receipt():
    # Initialize the printer
    ser.write(b'\x1b\x40')  # ESC @ - initialize/reset printer

    # Print text
    ser.write(b'\x1b\x21\x01')  # ESC ! - select print mode
    ser.write(b'Hello, World!\n')
    ser.write(b'Thank you for your purchase!\n')
    ser.write(b'\n\n')

    # Print a line separator
    ser.write(b'-' * 32 + b'\n')

    # Print a sample itemized receipt
    ser.write(b'Item 1         $1.00\n')
    ser.write(b'Item 2         $2.00\n')
    ser.write(b'Total          $3.00\n')

    # Feed and cut the paper
    ser.write(b'\n\n\n')  # Feed paper
    ser.write(b'\x1d\x56\x42\x00')  # ESC i - cut paper (if supported by the printer)

    # Close the serial connection after printing
    ser.close()

# Call the function to print
print_receipt()

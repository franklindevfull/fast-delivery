
def check_strings(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    in_string = None
    string_start = 0
    
    i = 0
    while i < len(content):
        char = content[i]
        
        # Simple escape handling
        if char == '\\':
            i += 2
            continue
            
        if not in_string:
            if char in ["'", '"', '`']:
                in_string = char
                string_start = i
        else:
            if char == in_string:
                in_string = None
                
        i += 1
        
    if in_string:
        print(f"Unclosed string {in_string} starting at character {string_start}")
    else:
        print("All strings closed.")

if __name__ == "__main__":
    import sys
    check_strings(sys.argv[1])

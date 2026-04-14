
import sys

def check_div_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    stack = []
    
    for i, line in enumerate(lines):
        line_num = i + 1
        # Very simple tag detection (not perfect for JSX but helps)
        # Look for <div and </div
        
        # We need to be careful with attributes
        if '<div' in line and '</div>' in line:
            # Check if it opens and closes on the same line
            # This is complex, but let's just count them
            opens = line.count('<div')
            closes = line.count('</div')
            if opens > closes:
                for _ in range(opens - closes):
                    stack.append(line_num)
            elif closes > opens:
                for _ in range(closes - opens):
                    if stack: stack.pop()
        elif '<div' in line:
            opens = line.count('<div')
            for _ in range(opens):
                stack.append(line_num)
        elif '</div>' in line:
            closes = line.count('</div')
            for _ in range(closes):
                if stack:
                    stack.pop()
                else:
                    print(f"Extra </div> at line {line_num}")
                    
    for line_num in stack:
        print(f"Unclosed <div> from line {line_num}")

if __name__ == "__main__":
    check_div_balance(sys.argv[1])

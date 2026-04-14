
import sys

def check_balance_stack(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    
    for i, char in enumerate(content):
        if char == '{': stack.append(('{', i))
        elif char == '}':
            if not stack or stack[-1][0] != '{':
                print(f"Mismatched }} at char {i}")
            else:
                stack.pop()
        elif char == '(': stack.append(('(', i))
        elif char == ')':
            if not stack or stack[-1][0] != '(':
                print(f"Mismatched ) at char {i}")
            else:
                stack.pop()
        elif char == '[': stack.append(('[', i))
        elif char == ']':
            if not stack or stack[-1][0] != '[':
                print(f"Mismatched ] at char {i}")
            else:
                stack.pop()
                
    if stack:
        for item, pos in stack:
            # Find line number
            line = content.count('\n', 0, pos) + 1
            print(f"Unclosed {item} at line {line} (char {pos})")
    else:
        print("Balanced.")

if __name__ == "__main__":
    check_balance_stack(sys.argv[1])

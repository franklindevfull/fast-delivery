from html.parser import HTMLParser
import sys

class TagCounter(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.self_closing = {'img', 'br', 'hr', 'input', 'link', 'meta', 'area', 'base', 'col', 'embed', 'keygen', 'param', 'source', 'track', 'wbr'}

    def handle_starttag(self, tag, attrs):
        if tag not in self.self_closing:
            self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        if tag not in self.self_closing:
            if not self.stack:
                print(f"Extra closing tag </{tag}> at {self.getpos()}")
            else:
                last_tag, pos = self.stack.pop()
                if last_tag != tag:
                    print(f"Mismatched tag </{tag}> at {self.getpos()}, expected </{last_tag}> from {pos}")

def check_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex to remove JSX expressions because they might contain tags
    # Actually, this is hard to parse as HTML. 
    # Let's just look at the raw tags in the file.
    parser = TagCounter()
    try:
        parser.feed(content)
    except Exception as e:
        print(f"Parser error: {e}")
    
    for tag, pos in parser.stack:
        print(f"Unclosed tag <{tag}> from {pos}")

if __name__ == "__main__":
    check_tags(sys.argv[1])

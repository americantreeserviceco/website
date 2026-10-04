import os
import sys
import subprocess
import html.parser
from datetime import datetime

class HTMLSyntaxChecker(html.parser.HTMLParser):
    """Custom HTML parser to catch basic structural syntax errors."""
    def __init__(self):
        super().__init__()
        self.errors = []

    def error(self, message):
        # Captures structural parsing issues
        self.errors.append(f"Line {self.getpos()[0]}, Col {self.getpos()[1]}: {message}")

def check_python(file_path):
    """Validates Python syntax using built-in compile and optional flake8."""
    errors = []
    # 1. Native structural check
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            source = f.read()
        compile(source, file_path, 'exec')
    except SyntaxError as e:
        errors.append(f"SyntaxError: {e.msg} (Line {e.lineno}, Col {e.offset})")
        return errors

    # 2. Optional deep linting if flake8 is installed
    try:
        result = subprocess.run(['flake8', file_path], capture_output=True, text=True, check=False)
        if result.returncode != 0 and result.stdout:
            errors.extend([line.strip() for line in result.stdout.splitlines() if line])
    except FileNotFoundError:
        pass # flake8 not installed, fallback to native compile success
        
    return errors

def check_bash(file_path):
    """Validates Bash scripts using bash -n and optional shellcheck."""
    errors = []
    # 1. Native dry-run check
    result = subprocess.run(['bash', '-n', file_path], capture_output=True, text=True, check=False)
    if result.returncode != 0:
        errors.extend([line.strip() for line in result.stderr.splitlines() if line])
        return errors

    # 2. Optional analytical linting if shellcheck is installed
    try:
        result = subprocess.run(['shellcheck', file_path], capture_output=True, text=True, check=False)
        if result.returncode != 0 and result.stdout:
            errors.extend([line.strip() for line in result.stdout.splitlines() if line])
    except FileNotFoundError:
        pass # shellcheck not installed
        
    return errors

def check_html(file_path):
    """Validates HTML syntax structure."""
    parser = HTMLSyntaxChecker()
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            parser.feed(f.read())
    except Exception as e:
        parser.errors.append(f"Parsing Failed: {str(e)}")
    return parser.errors

def check_javascript(file_path):
    """Validates JavaScript using local or global eslint."""
    errors = []
    try:
        result = subprocess.run(['eslint', file_path, '--format', 'compact'], capture_output=True, text=True, check=False)
        if result.returncode != 0 and result.stdout:
            errors.extend([line.strip() for line in result.stdout.splitlines() if line])
    except FileNotFoundError:
        errors.append("Skipped: 'eslint' is not installed or not found in system PATH.")
    return errors

def run_scanner(target_dir):
    """Walks through directories, triggers language checks, and writes scan_report.txt."""
    report_file = "scan_report.txt"
    supported_extensions = {
        '.py': ('Python', check_python),
        '.sh': ('Bash', check_bash),
        '.bash': ('Bash', check_bash),
        '.html': ('HTML', check_html),
        '.js': ('JavaScript', check_javascript)
    }

    # Tracking metrics
    total_scanned = 0
    files_with_errors = 0
    report_lines = []

    report_lines.append("=" * 60)
    report_lines.append(f"SYNTAX & LINTING AUDIT REPORT")
    report_lines.append(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append(f"Target Directory: {os.path.abspath(target_dir)}")
    report_lines.append("=" * 60 + "\n")

    # Dynamic directory walk
    for root, dirs, files in os.walk(target_dir):
        # Skip common heavy dependency/meta folders automatically
        dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', '__pycache__', 'env', 'venv')]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in supported_extensions:
                total_scanned += 1
                full_path = os.path.join(root, file)
                lang_name, check_function = supported_extensions[ext]
                
                # Run the targeted validation
                file_errors = check_function(full_path)
                
                if file_errors:
                    files_with_errors += 1
                    report_lines.append(f"[!] {lang_name} Issue Found in: {os.path.relpath(full_path, target_dir)}")
                    for err in file_errors:
                        report_lines.append(f"    --> {err}")
                    report_lines.append("-" * 40)

    # Summary segment
    summary = [
        "\n" + "=" * 60,
        "SCAN SUMMARY",
        "=" * 60,
        f"Total Files Inspected: {total_scanned}",
        f"Files with Issues:     {files_with_errors}",
        f"Healthy Files:         {total_scanned - files_with_errors}",
        "=" * 60
    ]
    report_lines.extend(summary)

    # Write report to disk
    with open(report_file, 'w', encoding='utf-8') as rf:
        rf.write("\n".join(report_lines))

    print("\n" + "\n".join(summary))
    print(f"\n[+] Detailed log successfully saved to: {os.path.abspath(report_file)}")

if __name__ == "__main__":
    # Fallback to current working directory if no argument provided
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    
    if not os.path.isdir(target):
        print(f"Error: '{target}' is not a valid directory.")
        sys.exit(1)
        
    print(f"Starting background diagnostic scan on directory: {target}...")
    run_scanner(target)

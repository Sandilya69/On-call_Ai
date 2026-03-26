import zipfile
import xml.etree.ElementTree as ET
import sys

def read_docx(file_path):
    with zipfile.ZipFile(file_path, 'r') as zf:
        xml_content = zf.read('word/document.xml')
    tree = ET.fromstring(xml_content)
    namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    text = []
    for paragraph in tree.iterfind('.//w:p', namespaces):
        para_text = "".join([t.text for t in paragraph.iterfind('.//w:t', namespaces) if t.text])
        if para_text:
            text.append(para_text)
    return "\n".join(text)

try:
    content = read_docx('c:/Users/tripa/On-call_Ai/OnCallMaestro_Frontend_PRD_v2.0.docx')
    with open('c:/Users/tripa/On-call_Ai/frontend_prd.txt', 'w', encoding='utf-8') as f:
        f.write(content)
except Exception as e:
    with open('c:/Users/tripa/On-call_Ai/frontend_prd.txt', 'w', encoding='utf-8') as f:
        f.write(f"Error: {e}")

import os
import glob
import json
import re

path = "app/templates/"
print "Path is " + path

print "Removing previous json files..."
for infile in glob.glob(os.path.join(path, "*.json")):
    print "> Current file is: " + infile
    os.remove(infile)


html_escape_table = {
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
    ">": "&gt;",
    "<": "&lt;",
    }


def html_escape(text):
    return "".join(html_escape_table.get(c, c) for c in text)

print "Building html file"
html_dict = []
for infile in glob.glob(os.path.join(path, "*.html")):
    print "> Current file is: " + infile
    current_dict = {}
    current_dict["name"] = infile[infile.rfind("/") + 1:infile.rfind(".")]
    current = open(infile, "r+")
    current_dict["markup"] = html_escape(current.read())
    if re.search("\&lt\;\@\=?(.+?)\@\&gt\;", current_dict["markup"]):
        current_dict["double_pass"] = True
    current.close()
    html_dict.append(current_dict)
html = open(os.path.join(path, "html.json"), "w+")
html.write(json.dumps(html_dict, indent=4))
html.close()

print "Building english file"
html_dict = []
for infile in glob.glob(os.path.join(path, "*.en.strings")):
    print "> Current file is: " + infile
    current_dict = {}
    current_dict["name"] = infile[infile.rfind("/") + 1:-11]
    current = open(infile, "r+")
    current_dict["localization"] = html_escape(current.read())
    current.close()
    html_dict.append(current_dict)
html = open(os.path.join(path, "en.json"), "w+")
html.write(json.dumps(html_dict, indent=4))
html.close()

print "Building french file"
html_dict = []
for infile in glob.glob(os.path.join(path, "*.fr.strings")):
    print "> Current file is: " + infile
    current_dict = {}
    current_dict["name"] = infile[infile.rfind("/") + 1:-11]
    current = open(infile, "r+")
    current_dict["localization"] = html_escape(current.read())
    current.close()
    html_dict.append(current_dict)
html = open(os.path.join(path, "fr.json"), "w+")
html.write(json.dumps(html_dict, indent=4))
html.close()
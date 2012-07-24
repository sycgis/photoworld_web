import os
import glob
import json
import sys

path = "app/shaders/"
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


print "Building shader file"
fshList = glob.glob(os.path.join(path, "*.fsh"))
vshList = glob.glob(os.path.join(path, "*.vsh"))
locList = glob.glob(os.path.join(path, "*.loc"))

if (len(fshList) != len(vshList)) or (len(fshList) != len(locList)):
    print "! Shader file missing..."
    sys.exit(0)

shader_dict = []
for fname in fshList:
    current_dict = {}
    fname = fname[fname.rfind("/") + 1:fname.rfind(".")]
    print "> Current shader is: " + fname
    current_dict["name"] = fname

    fsh = glob.glob(os.path.join(path, fname + ".fsh"))[0]
    current = open(fsh, "r+")
    current_dict["fragment"] = html_escape(current.read())
    current.close()

    vsh = glob.glob(os.path.join(path, fname + ".vsh"))[0]
    current = open(vsh, "r+")
    current_dict["vertex"] = html_escape(current.read())
    current.close()

    loc = glob.glob(os.path.join(path, fname + ".loc"))[0]
    current = open(loc, "r+")
    current_dict["locations"] = html_escape(current.read())
    current.close()

    shader_dict.append(current_dict)
shader = open(os.path.join(path, "shaders.json"), "w+")
shader.write(json.dumps(shader_dict, indent=4))
shader.close()

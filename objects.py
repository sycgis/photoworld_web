import os
import glob
import json

path = "app/objects/"
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


print "Building object file"
object_dict = []
for fname in glob.glob(os.path.join(path, "*.object")):
    current = open(fname, "r+")
    current_dict = json.loads(current.read())
    current.close()

    fname = fname[fname.rfind("/") + 1:fname.rfind(".")]
    print "> Current shader is: " + fname
    current_dict["name"] = fname

    object_dict.append(current_dict)
object = open(os.path.join(path, "objects.json"), "w+")
object.write(json.dumps(object_dict, indent=4))
object.close()

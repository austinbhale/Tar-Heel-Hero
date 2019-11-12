import re
import json

# cancel the free trial by November
# use musescore to download mxl sheet music files,
# convert to xml files, then find the <duration> of each
# instrument's notes that will be converted to usable data.

# for double/triple notes check if x-distance is either 0 or 4.5 apart due to single vs double digit tabs

def main():
    # Change file path and check part for each xml file.
    f = open('../sheet-music/avengers/avengers.xml', 'r')
    fl = f.readlines()

    guitarId = "<part id=\"P1\">" # make sure this is the instrument you want
    stopId = "</part>"
    instActive = False

    tied = "None"
    measure = 0
    defaultX = 0
    defaultY = 0
    pitch = 0
    duration = 0

    notes = []
    for line in fl:
        # if "score-part" in line:
        #     m = re.search(".*score-part id=\"(.*)\"", line)
        #     currId = m.group(1)
        
        # if "part-name" in line:
        #     if "lead guitar" in line:
        #         guitarId = currId

        if stopId in line:
            instActive = False
        elif guitarId in line:
            instActive = True

        if instActive:
            if "<measure" in line:
                m = re.search(r'.*number=\"([0-9]+)\".*', line)
                measure = m.group(1)
            elif "<note " in line:
                m = re.search(r'.*default-x=\"([0-9]+\.[0-9]+)\".*default-y=\"(-?[0-9]+\.[0-9]+)\".*', line)
                defaultX = m.group(1)
                defaultY = m.group(2)
            elif "<step>" in line:
                m = re.search(r'.*<step>(.+)</step>.*', line)
                pitch = m.group(1)
            elif "<duration>" in line:
                m = re.search(r'.*<duration>([0-9]+)</duration>.*', line)
                duration = m.group(1)
            elif "<tied" in line:
                m = re.search(r'.*<tied type=\"(.+)\".*', line)
                tied = m.group(1)
            elif "</note>" in line:
                if(measure and defaultX and defaultY and pitch and duration):
                    note = Note(measure, defaultX, defaultY, pitch, duration, tied)
                    notes.append(note)
                tied = "None"

    # json_string = json.dumps([note.__dict__ for note in notes])
    # print(json_string)

    with open('../data.json', 'w', encoding='utf-8') as f:
        json.dump([note.__dict__ for note in notes], f, ensure_ascii=False, indent=4)

class Note:
    def __init__(self, measure, defaultX, defaultY, pitch, duration, tied):
        self.measure = measure
        self.defaultX = defaultX
        self.defaultY = defaultY
        self.pitch = pitch
        self.duration = duration 
        self.tied = tied      

if __name__== "__main__":
  main()
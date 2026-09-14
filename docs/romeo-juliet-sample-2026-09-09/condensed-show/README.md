# 3場面の統合構成

前の5場面案を「1 / 2+3+4 / 5」に再編。元の12場面と19の内部キューを保持。
前の案は `outline-5-scenes-v1.json` と `index-5-scenes-v1.html` に保存。
新第2場面は `scene-02/` に台詞と動きをつないだ構成稿を用意。つなぎと二言の補筆はAI案で、本人推敲前。第1・第3場面の台本化と舞台上の尺は未確定。

`outline.json` is the canonical proposal. `build_outline.py` generates `index.html`.

This artifact changes scene grouping. It preserves the 12-scene script and direction notebook as source material and does not import anything into Stage Sketch.

Build:

```bash
python3 build_outline.py
python3 scene-02/build_script.py
```

`scene-02/script.json` is the editable composition source. It retains all eleven internal cue IDs, the source Japanese line references, the ten-performer cast, and the distinction between existing dialogue and new staging/bridge proposals. It is not a Stage Sketch import file.

2026-09-10: The overview's revenge summary was corrected to match the existing sample: Romeo intervenes before Mercutio is wounded, then retaliates immediately. The previous five-scene archive remains unchanged.

Revision 2 records RJ-NOTE-0029: in the promise/marriage movement, the Nurse's call becomes an unnamed offstage voice searching loudly for Juliet. Exact dialogue is labelled as draft wording; the voice performer is to be chosen from the existing ten cast members. Later scenes remain as before.

Revision 3 records RJ-NOTE-0030: the offstage search voice is assigned to the scenery crew (大道具さん), replacing the former proposal to choose from the ten actors. The individual crew member remains unspecified.

Visual integration: `../stage-visuals/layouts.json` provides a stage diagram for each scene and each Scene 2 cue. Rebuild the visual book first with `python3 ../stage-visuals/build_visuals.py`, then rebuild this overview and Scene 2. All 19 cues can be explored through 28 frames with isometric/plan views; the script text remains unchanged.

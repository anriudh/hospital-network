"""Crop the report screenshots to the part that matters, add a small title strip
and red boxes around the key lines. Originals in screenshots/ are not changed.
Output: report/figures/<name>.png"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "screenshots"
OUT = ROOT / "report" / "figures"
OUT.mkdir(exist_ok=True)

FONT = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 20)
FONT_B = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 22)
STRIP = (47, 72, 88)
RED = (220, 30, 30)
PAD = 6


def piece(shot, box, title, marks=()):
    """Crop one screenshot, draw highlight boxes, put a title strip on top."""
    im = Image.open(SRC / shot).convert("RGB")
    x0, y0, x1, y1 = box
    crop = im.crop(box)
    d = ImageDraw.Draw(crop)
    for mx0, my0, mx1, my1 in marks:
        d.rounded_rectangle((mx0 - x0 - 2, my0 - y0 - 1, mx1 - x0 + 2, my1 - y0 + 1),
                            radius=3, outline=RED, width=2)
    strip_h = 36
    out = Image.new("RGB", (crop.width + 2 * PAD, crop.height + strip_h + PAD), (255, 255, 255))
    ImageDraw.Draw(out).rectangle((0, 0, out.width, strip_h), fill=STRIP)
    ImageDraw.Draw(out).text((12, 5), title, font=FONT, fill=(255, 255, 255))
    out.paste(crop, (PAD, strip_h))
    ImageDraw.Draw(out).rectangle((0, 0, out.width - 1, out.height - 1), outline=STRIP, width=2)
    return out


def side_by_side(*ims, gap=16):
    h = max(i.height for i in ims)
    w = sum(i.width for i in ims) + gap * (len(ims) - 1)
    out = Image.new("RGB", (w, h), (255, 255, 255))
    x = 0
    for i in ims:
        out.paste(i, (x, 0))
        x += i.width + gap
    return out


def stacked(*ims, gap=10):
    w = max(i.width for i in ims)
    h = sum(i.height for i in ims) + gap * (len(ims) - 1)
    out = Image.new("RGB", (w, h), (255, 255, 255))
    y = 0
    for i in ims:
        out.paste(i, (0, y))
        y += i.height + gap
    return out


def topology():
    im = Image.open(SRC / "01_topology.png").convert("RGB")
    top = 175
    crop = im.crop((0, top, 800, 812))
    extra = 190
    out = Image.new("RGB", (crop.width + extra, crop.height), (255, 255, 255))
    out.paste(crop, (0, 0))
    d = ImageDraw.Draw(out)
    layers = [  # (label, y from, y to) in the original screenshot
        ("Internet / ISP", 180, 245, (120, 120, 120)),
        ("Edge (WAN)", 265, 320, (196, 120, 20)),
        ("Core layer", 365, 425, (30, 90, 170)),
        ("Access layer", 475, 530, (30, 130, 70)),
        ("End devices", 570, 810, (110, 60, 150)),
    ]
    x = crop.width + 12
    for label, a, b, col in layers:
        a, b = a - top, b - top
        d.line((x, a, x, b), fill=col, width=4)
        d.line((x, a, x + 10, a), fill=col, width=4)
        d.line((x, b, x + 10, b), fill=col, width=4)
        d.text((x + 18, (a + b) // 2 - 14), label, font=FONT_B, fill=col)
    d.rectangle((0, 0, out.width - 1, out.height - 1), outline=STRIP, width=2)
    return out


FIGS = {
    "topology": topology,
    "vlan_brief": lambda: piece("02_vlan_brief.png", (24, 575, 700, 918), "SW-DOC  |  show vlan brief",
                                [(28, 664, 512, 678), (28, 754, 656, 843)]),
    "trunks": lambda: piece("03_trunks.png", (24, 650, 700, 918), "SW-DOC  |  show interfaces trunk",
                            [(28, 859, 340, 888)]),
    "stp_root": lambda: piece("04_stp_root.png", (24, 565, 660, 885), "CORE1  |  show spanning-tree vlan 20",
                              [(130, 640, 320, 655)]),
    "etherchannel": lambda: piece("05_etherchannel.png", (24, 835, 670, 895), "CORE1  |  show etherchannel summary",
                                  [(28, 880, 438, 894)]),
    "standby_before": lambda: stacked(
        piece("06_standby_before.png", (24, 730, 660, 895), "CORE1  |  show standby brief",
              [(205, 790, 265, 893)]),
        piece("06_standby_before.png", (1000, 740, 1636, 905), "CORE2  |  show standby brief",
              [(1185, 800, 1250, 903)])),
    "ospf": lambda: piece("07_ospf.png", (24, 815, 710, 905), "EDGE  |  show ip ospf neighbor",
                          [(28, 874, 705, 903)]),
    "dhcp": lambda: piece("08_dhcp_lease.png", (20, 150, 900, 305), "PC-DOC1  |  Desktop > IP Configuration (DHCP)",
                          [(650, 192, 762, 302)]),
    "acl_counts": lambda: piece("09_acl_counts.png", (24, 304, 610, 456), "CORE1  |  show access-lists (part)",
                                [(60, 379, 470, 393), (60, 424, 605, 438)]),
    "web_portal": lambda: piece("10_web_portal_ok.png", (20, 100, 900, 245), "PC-RECEP1  |  Web Browser",
                                [(28, 140, 610, 190)]),
    "web_records_blocked": lambda: piece("11_web_records_blocked.png", (20, 100, 900, 180), "PC-RECEP1  |  Web Browser",
                                         [(28, 142, 180, 168)]),
    "ftp_lab": lambda: piece("12_ftp_lab.png", (24, 245, 600, 500), "PC-LAB1  |  Command Prompt",
                             [(28, 353, 150, 367)]),
    "ec_member_down": lambda: side_by_side(
        piece("13_etherchannel_member_down.png", (24, 320, 460, 698), "PC-DOC1  |  ping -n 60 172.16.10.131"),
        stacked(
            piece("13_etherchannel_member_down.png", (990, 429, 1720, 566), "CORE1  |  shutdown Gi0/1",
                  [(995, 520, 1700, 563)]),
            piece("13_etherchannel_member_down.png", (990, 835, 1640, 897), "CORE1  |  show etherchannel summary",
                  [(995, 880, 1405, 895)]))),
    "failover_ping": lambda: piece("14_failover_ping.png", (24, 395, 520, 653), "PC-DOC1  |  ping during CORE1 power-off",
                                   [(28, 533, 180, 577)]),
    "standby_after": lambda: piece("15_standby_after.png", (24, 730, 660, 908), "CORE2  |  show standby brief (CORE1 off)",
                                   [(205, 790, 265, 893)]),
    "guest_blocked": lambda: piece("16_guest_blocked.png", (20, 100, 560, 180), "GUEST-LAPTOP  |  Web Browser",
                                   [(28, 142, 180, 168)]),
    "guest_internet": lambda: piece("17_guest_internet.png", (20, 100, 560, 245), "GUEST-LAPTOP  |  Web Browser",
                                    [(28, 140, 350, 190)]),
    "nat": lambda: piece("18_nat.png", (24, 775, 660, 885), "EDGE  |  show ip nat translations",
                         [(28, 805, 650, 880)]),
    "ssh_ok": lambda: piece("19_ssh_ok.png", (24, 815, 520, 968), "ADMIN-PC (VLAN 99)  |  ssh -l admin 172.16.11.11",
                            [(28, 938, 110, 966)]),
    "ssh_denied": lambda: piece("20_ssh_denied.png", (24, 895, 520, 958), "PC-DOC1 (VLAN 20)  |  ssh -l admin 172.16.11.11",
                                [(28, 929, 435, 943)]),
}

if __name__ == "__main__":
    for name, fn in FIGS.items():
        im = fn()
        im.save(OUT / f"{name}.png", optimize=True)
        print(name, im.size)

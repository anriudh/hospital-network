// Builds Hospital_Network_Report.docx from the text below and the cropped figures.
// Run: node build_report.js   (figures come from make_figures.py)
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  AlignmentType, WidthType, BorderStyle, ShadingType, LevelFormat, Header, Footer,
  PageNumber, TabStopType, PageBreak, VerticalAlign,
} = require("docx");

// ---- team details (edit here, then rebuild) ----
const TEAM = [
  ["Anirudh A Menon", ""],
  ["Nagabhavit Pampati", ""],
  ["Chinmay Ghosh", ""],
  ["Adnan Ahmad Khan", ""],
];
const TITLE = "Design and Simulation of a Secure, Fault-Tolerant Hospital Network using Cisco Packet Tracer";
const COURSE = "Computer Networks (PE-7, Program Elective)";
const COLLEGE = "Manipal Institute of Technology, Bengaluru";
const DATE = "23 October 2026";

// ---- page and style constants (A4, DXA units) ----
const PAGE_W = 11906, PAGE_H = 16838, MARGIN = 1134; // 2 cm margins
const TEXT_W = PAGE_W - 2 * MARGIN;                   // 9638 DXA = 17 cm
const NAVY = "1F3A5F", HEAD = "355E8C", GRID = "7F7F7F", HEAD_FILL = "DCE6F2";
const FONT = "Calibri", MONO = "Consolas";
const FIG = path.join(__dirname, "figures");
const EMU_PER_PX = 9525; // docx-js transformation is in px at 96 dpi
const TEXT_W_PX = Math.floor(TEXT_W / 15);            // DXA -> px

let figNo = 0, tabNo = 0;

// ---- helpers ----
const t = (text, o = {}) => new TextRun({ text, font: FONT, size: 21, ...o });
function runs(s, o = {}) {
  // **bold** markup inside a string
  return s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) =>
    p.startsWith("**") ? t(p.slice(2, -2), { ...o, bold: true }) : t(p, o));
}
const P = (s, o = {}) => new Paragraph({
  children: typeof s === "string" ? runs(s) : s,
  spacing: { after: 80, line: 252 }, alignment: AlignmentType.JUSTIFIED, ...o,
});
const H1 = (s) => new Paragraph({
  children: [new TextRun({ text: s, font: FONT, size: 28, bold: true, color: HEAD })],
  spacing: { before: 160, after: 60 }, keepNext: true,
});
const H2 = (s) => new Paragraph({
  children: [new TextRun({ text: s, font: FONT, size: 22, bold: true, color: NAVY })],
  spacing: { before: 100, after: 30 }, keepNext: true,
});
const bullet = (s) => new Paragraph({
  children: runs(s), numbering: { reference: "dots", level: 0 },
  spacing: { after: 30, line: 252 },
});

function code(lines) {
  // shaded monospaced box made of paragraphs (no table, keeps page flow simple)
  return lines.map((l, i) => new Paragraph({
    children: [new TextRun({ text: l || " ", font: MONO, size: 16 })],
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "F2F2F2" },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: HEAD, space: 4 },
      ...(i === 0 ? { top: { style: BorderStyle.SINGLE, size: 2, color: "F2F2F2", space: 1 } } : {}),
    },
    spacing: { after: i === lines.length - 1 ? 100 : 0, line: 220 },
    indent: { left: 120 },
    keepLines: true, keepNext: i < lines.length - 1,
  }));
}

function imgSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), data: b };
}
function image(name, widthPx) {
  const { w, h, data } = imgSize(path.join(FIG, name + ".png"));
  const width = Math.min(widthPx, TEXT_W_PX);
  return new ImageRun({ type: "png", data, transformation: { width, height: Math.round(h * width / w) } });
}
function caption(text, prefix = "Figure") {
  const n = prefix === "Figure" ? ++figNo : ++tabNo;
  return new Paragraph({
    children: [t(`${prefix} ${n}: `, { bold: true, size: 19, color: NAVY }), t(text, { size: 19, italics: true })],
    alignment: AlignmentType.CENTER, spacing: { before: 40, after: 140 },
    ...(prefix === "Table" ? { keepNext: true } : {}),
  });
}
function figure(name, widthPx, text) {
  return [
    new Paragraph({ children: [image(name, widthPx)], alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 60 } }),
    caption(text),
  ];
}
function figurePair(a, b, text) {
  // two images side by side in a borderless table, one caption under both
  const half = Math.floor(TEXT_W / 2);
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const cell = (name) => new TableCell({
    width: { size: half, type: WidthType.DXA },
    borders: { top: none, bottom: none, left: none, right: none },
    verticalAlign: VerticalAlign.TOP,
    children: [new Paragraph({ children: [image(name, Math.floor(half / 15) - 10)], alignment: AlignmentType.CENTER })],
  });
  return [
    new Table({ width: { size: TEXT_W, type: WidthType.DXA }, columnWidths: [half, TEXT_W - half],
      borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
      rows: [new TableRow({ cantSplit: true, children: [cell(a), cell(b)] })] }),
    caption(text),
  ];
}

function table(header, rows, widths, o = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const b = { style: BorderStyle.SINGLE, size: 4, color: GRID };
  const borders = { top: b, bottom: b, left: b, right: b };
  const size = o.size || 18;
  const mk = (cells, isHead) => new TableRow({
    tableHeader: isHead, cantSplit: true,
    children: cells.map((c, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA }, borders,
      shading: isHead ? { type: ShadingType.CLEAR, color: "auto", fill: HEAD_FILL } : undefined,
      margins: { top: 30, bottom: 30, left: 80, right: 80 },
      children: [new Paragraph({ children: runs(String(c), { size, bold: isHead || undefined }), spacing: { after: 0 } })],
    })),
  });
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [mk(header, true), ...rows.map((r) => mk(r, false))] });
}

// ---- front block (template header fields) ----
function field(label, value) {
  return new Paragraph({ children: [t(label + ": ", { bold: true }), t(value)], spacing: { after: 40 } });
}
const front = [
  new Paragraph({
    children: [new TextRun({ text: "Cisco Packet Tracer Mini Project Report", font: FONT, size: 36, bold: true, color: NAVY })],
    alignment: AlignmentType.CENTER, spacing: { after: 60 },
  }),
  new Paragraph({
    children: [t(COLLEGE, { size: 22, color: "404040" })], alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: HEAD, space: 6 } },
  }),
  field("Project title", TITLE),
  new Paragraph({ children: [t("Student names and registration numbers:", { bold: true })], spacing: { after: 40 } }),
  table(["#", "Student name", "Registration number"],
    TEAM.map((m, i) => [String(i + 1), m[0], m[1]]), [500, 4600, 3200], { size: 20 }),
  new Paragraph({ children: [], spacing: { after: 40 } }),
  new Paragraph({
    children: [t("Course and section: ", { bold: true }), t(COURSE),
      new TextRun({ text: "\tDate: ", font: FONT, size: 21, bold: true }), t(DATE)],
    tabStops: [{ type: TabStopType.LEFT, position: 6400 }], spacing: { after: 120 },
  }),
];

// ---- 1. Problem definition ----
const s1 = [
  H1("1  Problem Definition"),
  P("A mid-sized hospital has five departments (Reception, Doctors/OPD, Laboratory, Pharmacy and a server room) plus a guest Wi-Fi area in the lobby. Staff PCs must reach shared servers (patient records, a staff portal, DNS/DHCP) and the internet, but each department should only reach what it needs, and guests must be kept completely away from patient data. A flat network, with every device in one broadcast domain behind one switch and one gateway, fails on both counts: any user can reach the records server, and a single switch or cable failure stops the whole hospital. This project designs and simulates in Cisco Packet Tracer 9.0.1 a network that separates the departments, controls traffic between them, survives the loss of a core switch or link, and gives staff and guests internet access, and then verifies all of this with ping, web, FTP and SSH tests."),
];

// ---- 2. Objectives ----
const s2 = [
  H1("2  Objectives"),
  bullet("Connect all end devices, access switches, core switches and routers in a three-layer (access, core, edge) design."),
  bullet("Separate the departments into VLANs and assign addresses with a VLSM plan from 172.16.10.0/23."),
  bullet("Make the core fault tolerant with two multilayer switches, dual uplinks, an LACP EtherChannel, Rapid-PVST and HSRP."),
  bullet("Route between VLANs and to the internet with OSPF and PAT, and provide DHCP, DNS, web and FTP services."),
  bullet("Enforce a security policy with ACLs, port security, unused-port shutdown and SSH-only management."),
  bullet("Verify communication, the access policy and failover between the specified devices with tests."),
];

// ---- 3. Network requirements ----
const s3 = [
  H1("3  Network Requirements"),
  P("The devices below were placed in Packet Tracer. Every access switch has one uplink to each core switch, the two cores are joined by a two-link EtherChannel, and the edge router has a routed link to each core."),
  caption("Devices used", "Table"),
  table(["Device (model)", "Qty", "Name(s)", "Role"], [
    ["Multilayer switch (Catalyst 3560-24PS)", "2", "CORE1, CORE2", "Core layer: inter-VLAN routing, HSRP gateways, ACLs"],
    ["Switch (Catalyst 2960-24TT)", "5", "SW-RECEP, SW-DOC, SW-LAB, SW-PHARM, SW-SRV", "Access layer, one per department / server room"],
    ["Router (ISR 2911)", "2", "EDGE, ISP", "EDGE: OSPF, default route, PAT. ISP: simulated provider"],
    ["Server-PT", "4", "RECORDS, PORTAL, DNS-DHCP, INET-SRV", "Patient records (web, FTP), staff portal, DNS/DHCP, internet web server"],
    ["PC-PT", "9", "PC-RECEP1/2, PC-DOC1/2, PC-LAB1/2, PC-PHARM1/2, ADMIN-PC", "Department users and the network admin PC"],
    ["AccessPoint-PT + wireless clients", "1 + 2", "AP-LOBBY, GUEST-LAPTOP, GUEST-PHONE", "Guest Wi-Fi in the lobby"],
  ], [2500, 600, 3300, 3238]),
  new Paragraph({ children: [], spacing: { after: 60 } }),
  P("**Links:** copper straight-through cables to end devices and the edge router, crossover cables between switches, 25 devices and 29 cabled links in total. **Subnets:** 7 VLAN subnets, 2 point-to-point /30 core-to-edge links, a public /30 to the ISP and a simulated internet LAN (Table 3)."),
  P("**Devices and services used:** VLANs and 802.1Q trunks, VLSM, LACP EtherChannel, Rapid-PVST, HSRP, inter-VLAN routing on SVIs, OSPF area 0, static default route, PAT (NAT overload), DHCP with relay, DNS, HTTP/HTTPS, FTP, extended named ACLs, port security, SSH version 2."),
];

// ---- 4. Topology ----
const s4 = [
  H1("4  Network Topology"),
  P("Figure 1 shows the completed topology. The **access layer** connects the users, servers and the lobby access point. The **core layer** has two 3560 switches that route between VLANs. If one core switch or uplink fails, traffic moves to the other one. The **edge** router connects the hospital to the ISP. Dashed lines are crossover links. On each access switch the uplink to CORE2 is blocked by spanning tree (amber), and it takes over only if the CORE1 path fails."),
  ...figure("topology", TEXT_W_PX, "Completed Packet Tracer topology with the network layers labelled"),
];

// ---- 5. IP addressing ----
const s5 = [
  H1("5  IP Addressing Table"),
  P("All internal addresses come from 172.16.10.0/23, split with VLSM, largest subnet first. This avoids wasting addresses: Guest gets a /25 for about 100 users while the Servers VLAN only needs a /28. In every VLAN the first host is the HSRP virtual gateway, the second is CORE1 and the third is CORE2. User PCs and guests get their addresses by DHCP from DNS-DHCP."),
  caption("IP addressing of the key devices", "Table"),
  table(["Device", "Interface", "IP address", "Subnet mask", "Default gateway"], [
    ["PC-DOC1 (example DHCP client)", "FastEthernet0", "172.16.10.143 (DHCP)", "255.255.255.192", "172.16.10.129"],
    ["RECORDS", "FastEthernet0", "172.16.11.70", "255.255.255.240", "172.16.11.65"],
    ["PORTAL", "FastEthernet0", "172.16.11.71", "255.255.255.240", "172.16.11.65"],
    ["DNS-DHCP", "FastEthernet0", "172.16.11.72", "255.255.255.240", "172.16.11.65"],
    ["ADMIN-PC", "FastEthernet0", "172.16.11.10", "255.255.255.224", "172.16.11.1"],
    ["SW-RECEP ... SW-SRV", "Vlan99", "172.16.11.11 to .15", "255.255.255.224", "172.16.11.1"],
    ["CORE1", "Vlan10/20/30/40/50/60/99", "2nd host of each VLAN", "per VLAN", "-"],
    ["CORE2", "Vlan10/20/30/40/50/60/99", "3rd host of each VLAN", "per VLAN", "-"],
    ["CORE1 / CORE2", "Fa0/24 (to EDGE)", "172.16.11.82 / .86", "255.255.255.252", "-"],
    ["EDGE", "Gi0/0 / Gi0/1", "172.16.11.81 / .85", "255.255.255.252", "-"],
    ["EDGE", "Gi0/2 (to ISP)", "203.0.113.2", "255.255.255.252", "203.0.113.1 (default route)"],
    ["ISP", "Gi0/0 / Gi0/1", "203.0.113.1 / 198.51.100.1", "/30 / 255.255.255.0", "-"],
    ["INET-SRV", "FastEthernet0", "198.51.100.10", "255.255.255.0", "198.51.100.1"],
  ], [2500, 2050, 2000, 1588, 1500], { size: 17 }),
  new Paragraph({ children: [], spacing: { after: 60 } }),
  caption("VLAN and VLSM subnet plan", "Table"),
  table(["VLAN", "Name", "Hosts needed", "Subnet", "Mask", "HSRP gateway (VIP)"], [
    ["60", "Guest Wi-Fi", "100", "172.16.10.0/25", "255.255.255.128", "172.16.10.1"],
    ["20", "Doctors / OPD", "50", "172.16.10.128/26", "255.255.255.192", "172.16.10.129"],
    ["10", "Reception", "25", "172.16.10.192/27", "255.255.255.224", "172.16.10.193"],
    ["30", "Laboratory", "25", "172.16.10.224/27", "255.255.255.224", "172.16.10.225"],
    ["99", "Management", "20", "172.16.11.0/27", "255.255.255.224", "172.16.11.1"],
    ["40", "Pharmacy", "12", "172.16.11.32/27", "255.255.255.224", "172.16.11.33"],
    ["50", "Servers", "10", "172.16.11.64/28", "255.255.255.240", "172.16.11.65"],
    ["999", "Blackhole (unused ports)", "-", "-", "-", "-"],
  ], [800, 2300, 1300, 1900, 1738, 1600], { size: 17 }),
];

// ---- 6. Configuration ----
const s6 = [
  H1("6  Configuration and Implementation"),
  P("The devices were cabled as in Figure 1 and configured from the IOS CLI. The full running configuration of every switch and router is in the project folder (configs/). The main features are summarised below."),
  H2("6.1  VLANs, access ports and trunks"),
  P("VLANs 10 to 99 and 999 exist on all seven switches. Department PCs sit on access ports with PortFast and port security, and both uplinks of each access switch are 802.1Q trunks. Unused ports are put in VLAN 999 and shut down."),
  ...code([
    "interface FastEthernet0/1                     ! SW-DOC, PC-DOC1",
    " switchport mode access",
    " switchport access vlan 20",
    " switchport port-security maximum 2",
    " switchport port-security mac-address sticky",
    " switchport port-security violation restrict",
    " spanning-tree portfast",
  ]),
  H2("6.2  EtherChannel, Rapid-PVST and HSRP"),
  P("CORE1 and CORE2 are joined by Port-channel 1 (Gi0/1 and Gi0/2, LACP), carried as a trunk. Rapid-PVST runs on every switch with CORE1 as root bridge for all VLANs, so the blocked uplinks are always the ones to CORE2. Each VLAN has an SVI on both cores and an HSRP group: CORE1 has priority 110 and is Active, CORE2 has 100 and is Standby, with preempt and fast timers (hello 1 s, hold 3 s). The root bridge and the Active gateway are on the same switch, so traffic does not take a detour over the EtherChannel."),
  ...code([
    "spanning-tree mode rapid-pvst                 ! CORE1",
    "spanning-tree vlan 1,10,20,30,40,50,60,99,999 priority 24576",
    "interface GigabitEthernet0/1                 ! same on Gi0/2",
    " channel-group 1 mode active",
    "interface Vlan20",
    " ip address 172.16.10.130 255.255.255.192",
    " ip helper-address 172.16.11.72",
    " ip access-group DOCTORS-IN in",
    " standby 20 ip 172.16.10.129",
    " standby 20 priority 110",
    " standby 20 preempt",
    " standby 20 timers 1 3",
  ]),
  ...figure("standby_before", 400, "show standby brief: CORE1 Active and CORE2 Standby for all 7 VLAN gateways"),
  H2("6.3  Routing, NAT and services"),
  P("OSPF area 0 runs on CORE1 (router ID 1.1.1.1), CORE2 (2.2.2.2) and EDGE. All SVIs are passive, so adjacencies only form on the two routed links to EDGE. EDGE has a static default route to the ISP and advertises it into OSPF with default-information originate. PAT translates the whole 172.16.10.0/23 range to EDGE's public address 203.0.113.2. DNS-DHCP holds five DHCP pools (one per user VLAN, reached through ip helper-address on the cores) and DNS records for records.hospital.local and portal.hospital.local. RECORDS runs HTTP and FTP, PORTAL runs HTTP and HTTPS."),
  ...code([
    "router ospf 1                                  ! EDGE",
    " network 172.16.11.80 0.0.0.3 area 0",
    " network 172.16.11.84 0.0.0.3 area 0",
    " default-information originate",
    "ip route 0.0.0.0 0.0.0.0 203.0.113.1",
    "ip nat inside source list NAT-INSIDE interface GigabitEthernet0/2 overload",
  ]),
  H2("6.4  Security"),
  P("Named extended ACLs are applied inbound on the user SVIs of both cores, so the policy still holds after a failover (Table 4). Every user ACL also permits DHCP, DNS to 172.16.11.72 and ICMP echo-reply, then denies the rest of 172.16.10.0/23 and permits the internet. Switches and EDGE accept only SSH version 2 on the VTY lines, only from VLAN 99 (access-class MGMT-SSH), with a local user, enable secret and service password-encryption."),
  caption("Department access policy (ACLs inbound on the core SVIs)", "Table"),
  table(["Source VLAN (ACL)", "Allowed inside the hospital", "Blocked"], [
    ["Doctors 20 (DOCTORS-IN)", "Everything: RECORDS, PORTAL, other departments", "Management VLAN 99"],
    ["Reception 10 (RECEPTION-IN)", "PORTAL web (HTTP, HTTPS)", "RECORDS, other departments"],
    ["Laboratory 30 (LAB-IN)", "PORTAL web, RECORDS FTP (upload results)", "RECORDS web, other departments"],
    ["Pharmacy 40 (PHARMACY-IN)", "PORTAL web, RECORDS HTTP (view prescriptions)", "RECORDS FTP and HTTPS, other departments"],
    ["Guest 60 (GUEST-IN)", "Only DHCP and DNS", "All of 172.16.10.0/23"],
    ["Management 99 (no ACL)", "Everything, SSH to all devices", "-"],
  ], [2700, 4038, 2900], { size: 17 }),
  new Paragraph({ children: [], spacing: { after: 60 } }),
];

// ---- 7. Testing ----
const s7 = [
  H1("7  Testing and Results"),
  P("Tests were run in Realtime mode with ping, nslookup, the PC web browser, FTP and SSH clients. The expected outcome of each test comes from the design: allowed traffic must work, blocked traffic must fail, and a failure in the core must cost only a few packets. Table 5 summarises the results."),
  caption("Test summary", "Table"),
  table(["Source", "Destination", "Test performed", "Result"], [
    ["One host per VLAN (6)", "RECORDS, PORTAL, DNS-DHCP, INET-SRV, PC-RECEP2, PC-DOC2, ADMIN-PC", "Ping matrix (42 cells)", "Success: all 42 cells matched the ACL policy"],
    ["PC-RECEP1, PC-DOC1, PC-LAB1, PC-PHARM1, GUEST-LAPTOP", "PORTAL, RECORDS, INET-SRV", "Web browser (12 HTTP/HTTPS checks)", "Success: 12/12 as expected (e.g. Reception gets PORTAL, RECORDS times out)"],
    ["PC-LAB1 / PC-PHARM1", "RECORDS", "FTP login", "Success: Lab logged in; Pharmacy blocked as intended"],
    ["DHCP clients", "DNS-DHCP", "DHCP lease, nslookup", "Success: correct address, gateway and DNS on every client"],
    ["PC-DOC1", "CORE2 Vlan20 (via Po1)", "60 pings, one EtherChannel member shut", "Success: 60/60 replies, Po1 stayed up on Gi0/2"],
    ["PC-DOC1", "RECORDS", "200 pings, CORE1 powered off", "Success: 198/200 replies, CORE2 Active on all 7 groups"],
    ["GUEST-LAPTOP", "RECORDS, PC-DOC1, INET-SRV", "Ping, web, NAT check", "Success: internal blocked (8 ACL denies), internet 20/20 via PAT"],
    ["ADMIN-PC / PC-DOC1", "SW-RECEP 172.16.11.11", "SSH and Telnet", "Success: SSH from VLAN 99 only, Telnet refused"],
  ], [2050, 2500, 2338, 2750], { size: 17 }),
  new Paragraph({ children: [], spacing: { after: 60 } }),
  H2("7.1  EtherChannel member failure"),
  P("PC-DOC1 pinged CORE2's VLAN 20 address. Every packet had to cross Po1 because SW-DOC's uplink to CORE2 is blocked. While the ping ran, Gi0/1 on CORE1 was shut down. Po1 stayed up (SU) on Gi0/2 and the recorded test lost no packets (60/60). In the screenshot run, 1 of 60 was lost when Gi0/1 came back up and HSRP on CORE2 briefly flapped for two VLANs."),
  ...figure("ec_member_down", 560, "Ping keeps replying while Gi0/1 is shut; Po1 stays up with Gig0/1(D) Gig0/2(P)"),
  H2("7.2  Core switch failure (HSRP failover)"),
  P("PC-DOC1 sent 200 pings to RECORDS and CORE1 was powered off mid-way. Both the VLAN 20 and the VLAN 50 gateway had to move to CORE2. Only 2 packets were lost (198/200, about 2 seconds), which matches the 3-second HSRP hold time. With default timers (hold 10 s) about 10 packets would be lost. The screenshot run lost 3 packets. When CORE1 came back it took the Active role back (preempt) with 3 of 150 packets lost. The PCs kept the same gateway address the whole time."),
  ...figurePair("failover_ping", "standby_after", "Left: ping loses 3 packets during the failover. Right: CORE2 is now Active for all 7 groups"),
  H2("7.3  Guest isolation and internet access"),
  P("From the guest laptop on the lobby Wi-Fi, pings and web requests to RECORDS and to a Doctors PC failed with \"Destination host unreachable\" from the guest VLAN's own gateway, which shows that the core ACL dropped them (8 deny matches on GUEST-IN). The internet web server loaded and 20/20 pings succeeded, translated by PAT on EDGE."),
  ...figurePair("guest_blocked", "guest_internet", "Guest laptop: the records server times out (left), the internet server loads (right)"),
  ...figure("nat", 400, "PAT on EDGE: inside local 172.16.10.10 leaves as inside global 203.0.113.2"),
];

// ---- 8. Conclusion ----
const s8 = [
  H1("8  Conclusion"),
  P("All six objectives were achieved and each one was confirmed by a test in Section 7. The departments are separated into VLANs with a VLSM plan, every access policy in Table 4 behaved as designed, losing an EtherChannel link cost no traffic, and losing a whole core switch cost about 2 seconds without any change on the PCs. Staff and guests reach the internet through PAT, while guests cannot reach any hospital system. The main lesson was that the features must agree with each other: the spanning tree root has to be the same switch as the HSRP Active gateway, and the order of ACL lines decides what is really allowed."),
  P("**Limitations and possible improvements:**"),
  bullet("EDGE and the single ISP link are a single point of failure for internet access. A second edge router and ISP would remove it."),
  bullet("Packet Tracer does not save the HSRP timers (standby timers 1 3), so they must be typed again after a reload. Real switches keep them."),
  bullet("CORE1 is Active for every VLAN, so CORE2 only forwards after a failure. HSRP load sharing would use both cores."),
  bullet("After a core power cycle, spanning tree once stayed in a wrong state until the CORE2 downlinks were reset. During that state a ping showed duplicate replies (a short loop)."),
  bullet("The guest Wi-Fi is an open network; a real deployment would use WPA2/WPA3 with a captive portal. Other future work: AAA with RADIUS, syslog and SNMP monitoring, IPv6 and a firewall at the edge."),
];

const refs = [
  H1("References"),
  bullet("Cisco Networking Academy, Cisco Packet Tracer 9.0.1 documentation and help files."),
  bullet("Cisco Systems, Catalyst 3560 Switch Software Configuration Guide (VLANs, EtherChannel, Rapid-PVST, HSRP, ACLs)."),
  bullet("Cisco Systems, Cisco 2900 Series ISR Software Configuration Guide (OSPF, NAT/PAT, SSH)."),
  bullet("Course textbook and lab manuals, Computer Networks (PE-7), Manipal Institute of Technology, Bengaluru."),
];

// ---- appendix: the screenshots not shown in the body ----
let appNo = 0;
function appFig(name, widthPx, text) {
  return [
    new Paragraph({ children: [image(name, widthPx)], alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 60 } }),
    new Paragraph({
      children: [t(`Figure A${++appNo}: `, { bold: true, size: 19, color: NAVY }), t(text, { size: 19, italics: true })],
      alignment: AlignmentType.CENTER, spacing: { before: 40, after: 160 },
    }),
  ];
}
const appendix = [
  new Paragraph({ children: [new PageBreak()] }),
  H1("Appendix A: Additional Screenshots"),
  P("Further evidence from the simulation. Each screenshot is cropped to the relevant output and the key lines are boxed in red. Screenshots already shown in the report are not repeated."),
  ...appFig("vlan_brief", 470, "SW-DOC show vlan brief: Fa0/1-2 in VLAN 20, unused ports in VLAN 999"),
  ...appFig("trunks", 470, "SW-DOC show interfaces trunk: Gi0/2 forwards no VLANs (blocked by spanning tree)"),
  ...appFig("stp_root", 450, "CORE1 show spanning-tree vlan 20: this bridge is the root"),
  ...appFig("etherchannel", 450, "CORE1 show etherchannel summary: Po1(SU) with both members bundled (P)"),
  ...appFig("ospf", 480, "EDGE show ip ospf neighbor: two FULL neighbours, 1.1.1.1 and 2.2.2.2"),
  ...appFig("dhcp", 560, "PC-DOC1 lease from DNS-DHCP: address, mask, gateway 172.16.10.129 and DNS 172.16.11.72"),
  ...appFig("acl_counts", 450, "CORE1 show access-lists: match counts on the deny lines after blocked pings"),
  ...appFig("web_portal", 560, "PC-RECEP1 opens the staff portal (allowed)"),
  ...appFig("web_records_blocked", 560, "PC-RECEP1 cannot open the records server (blocked by RECEPTION-IN)"),
  ...appFig("ftp_lab", 420, "PC-LAB1 logs in to the RECORDS FTP server (230 Logged in)"),
  ...appFig("ssh_ok", 380, "ADMIN-PC in VLAN 99 reaches SW-RECEP over SSH"),
  ...appFig("ssh_denied", 380, "PC-DOC1 in VLAN 20 cannot open SSH to the switch (connection timed out)"),
];

// ---- document ----
const doc = new Document({
  creator: "Anirudh A Menon",
  title: TITLE,
  styles: { default: { document: { run: { font: FONT, size: 21 } } } },
  numbering: { config: [{ reference: "dots", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
    alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 260 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, header: 500, footer: 500 } } },
    headers: { default: new Header({ children: [new Paragraph({
      children: [t("Secure, Fault-Tolerant Hospital Network", { size: 16, color: "7F7F7F" }),
        new TextRun({ text: "\tComputer Networks Mini Project", font: FONT, size: 16, color: "7F7F7F" })],
      tabStops: [{ type: TabStopType.RIGHT, position: TEXT_W }],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF", space: 4 } },
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: "7F7F7F" })] })] }) },
    children: [...front, ...s1, ...s2, ...s3, ...s4, ...s5, ...s6, ...s7, ...s8, ...refs, ...appendix],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, "Hospital_Network_Report.docx");
  fs.writeFileSync(out, buf);
  console.log("wrote", out);
});

## Libreria di disegno procedurale: ogni funzione disegna su un CanvasItem (dentro _draw).

static func ell(c: CanvasItem, p: Vector2, r: Vector2, col: Color) -> void:
	var pts := PackedVector2Array()
	for i in 24:
		pts.append(p + Vector2(cos(TAU * i / 24.0) * r.x, sin(TAU * i / 24.0) * r.y))
	c.draw_colored_polygon(pts, col)

static func quad(c: CanvasItem, a: Vector2, b: Vector2, d: Vector2, e: Vector2, col: Color) -> void:
	c.draw_colored_polygon(PackedVector2Array([a, b, d, e]), col)
	c.draw_polyline(PackedVector2Array([a, b, d, e, a]), Color(col.darkened(0.55), 0.6), 1.5)

## Parallelepipedo isometrico: hw = semi-larghezza, h = altezza, o = offset del vertice basso.
static func cube(c: CanvasItem, hw: float, h: float, col: Color, o := Vector2.ZERO) -> void:
	var l := o + Vector2(-hw, -hw / 2)
	var b := o
	var r := o + Vector2(hw, -hw / 2)
	var k := o + Vector2(0, -hw)
	var u := Vector2(0, -h)
	quad(c, l, b, b + u, l + u, col.lightened(0.1))
	quad(c, b, r, r + u, b + u, col.darkened(0.18))
	quad(c, l + u, b + u, r + u, k + u, col.lightened(0.28))
	quad(c, l, b, b + Vector2(0, -6), l + Vector2(0, -6), Color(0, 0.05, 0.15, 0.14))
	quad(c, b, r, r + Vector2(0, -6), b + Vector2(0, -6), Color(0, 0.05, 0.15, 0.2))

static func roof(c: CanvasItem, hw: float, base_h: float, rise: float, col: Color, o := Vector2.ZERO) -> void:
	var ce := o + Vector2(0, -hw / 2 - base_h)
	var tl := ce + Vector2(-hw, 0) * 1.15
	var b := ce + Vector2(0, hw / 2) * 1.15
	var r := ce + Vector2(hw, 0) * 1.15
	var ap := ce + Vector2(0, -rise)
	quad(c, tl, b, ap, ap, col.lightened(0.1))
	quad(c, b, r, ap, ap, col.darkened(0.15))
	for f in [0.12, 0.26]:
		c.draw_line(tl.lerp(ap, f), b.lerp(ap, f), col.darkened(0.3), 1.5)
		c.draw_line(b.lerp(ap, f), r.lerp(ap, f), col.darkened(0.42), 1.5)
	quad(c, tl, b, b + Vector2(0, 5), tl + Vector2(0, 5), col.darkened(0.45))
	quad(c, b, r, r + Vector2(0, 5), b + Vector2(0, 5), col.darkened(0.55))
	c.draw_colored_polygon(PackedVector2Array([ap, ap.lerp(tl, 0.62), ap.lerp(b, 0.62)]), Color("f4f9fc"))
	c.draw_colored_polygon(PackedVector2Array([ap, ap.lerp(b, 0.62), ap.lerp(r, 0.62)]), Color("dce8f0"))
	for k in 9:
		var q := k / 8.0
		var ln := 4.0 + float(k % 3) * 3.0
		for seg in 2:
			var p0 := tl if seg == 0 else b
			var p1 := b if seg == 0 else r
			var ip := p0.lerp(p1, q)
			c.draw_colored_polygon(PackedVector2Array([ip + Vector2(-2, 0), ip + Vector2(2, 0), ip + Vector2(0, ln)]), Color(0.85, 0.94, 1.0, 0.9))

static func smoke(c: CanvasItem, p: Vector2, t: float) -> void:
	for k in 3:
		var ph := fmod(t * 0.5 + k / 3.0, 1.0)
		c.draw_circle(p + Vector2(ph * 12, -ph * 36), 3.0 + ph * 6.0, Color(1, 1, 1, 0.45 * (1.0 - ph)))

static func glow(c: CanvasItem, p: Vector2, r: float, col: Color) -> void:
	c.draw_circle(p, r, Color(col, 0.16))
	c.draw_circle(p, r * 0.55, Color(col, 0.22))

## Faccia di una parete: a-b = spigolo di base, s0..s1 = tratto lungo la base, y0..y1 = altezza.
static func face(c: CanvasItem, a: Vector2, b: Vector2, s0: float, s1: float, y0: float, y1: float, col: Color) -> void:
	var p0 := a.lerp(b, s0)
	var p1 := a.lerp(b, s1)
	quad(c, p0 + Vector2(0, -y0), p1 + Vector2(0, -y0), p1 + Vector2(0, -y1), p0 + Vector2(0, -y1), col)

static func window(c: CanvasItem, a: Vector2, b: Vector2, s0: float, s1: float, y0: float, y1: float, lit: bool) -> void:
	face(c, a, b, s0 - 0.03, s1 + 0.03, y0 - 3.0, y1 + 3.0, Color("f4f9fc"))
	face(c, a, b, s0, s1, y0, y1, Color("ffd966") if lit else Color("3b4652"))
	if lit:
		face(c, a, b, s0, s1, y0 + (y1 - y0) * 0.55, y1, Color("ffe9a0"))
	var m := (s0 + s1) / 2.0
	var wood := Color("5b3f2a")
	c.draw_line(a.lerp(b, m) + Vector2(0, -y0), a.lerp(b, m) + Vector2(0, -y1), wood, 2.0)
	c.draw_line(a.lerp(b, s0) + Vector2(0, -(y0 + y1) / 2.0), a.lerp(b, s1) + Vector2(0, -(y0 + y1) / 2.0), wood, 2.0)

## Anello a terra (ellisse schiacciata) e alone morbido.
static func ground_ring(c: CanvasItem, r: float, col: Color, w: float) -> void:
	c.draw_set_transform(Vector2.ZERO, 0.0, Vector2(1.0, 0.45))
	c.draw_arc(Vector2.ZERO, r, 0.0, TAU, 48, col, w)
	c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

static func ground_glow(c: CanvasItem, r: float, col: Color) -> void:
	ell(c, Vector2.ZERO, Vector2(r, r * 0.45), col)

static func sparkle(c: CanvasItem, p: Vector2, s: float, col: Color) -> void:
	c.draw_colored_polygon(PackedVector2Array([p + Vector2(0, -s), p + Vector2(s * 0.22, -s * 0.22), p + Vector2(s, 0), p + Vector2(s * 0.22, s * 0.22), p + Vector2(0, s), p + Vector2(-s * 0.22, s * 0.22), p + Vector2(-s, 0), p + Vector2(-s * 0.22, -s * 0.22)]), col)

## Freccia dorata che rimbalza: la usa Nico per indicare un luogo.
static func arrow(c: CanvasItem, pos: Vector2, t: float) -> void:
	var p := pos + Vector2(0, sin(t * 5.0) * 7.0)
	c.draw_circle(p + Vector2(0, -4), 26.0, Color(1, 0.85, 0.3, 0.18))
	var pts := PackedVector2Array([p + Vector2(-9, -22), p + Vector2(9, -22), p + Vector2(9, -8), p + Vector2(19, -8), p + Vector2(0, 14), p + Vector2(-19, -8), p + Vector2(-9, -8)])
	c.draw_colored_polygon(pts, Color("ffd24a"))
	c.draw_polyline(pts + PackedVector2Array([pts[0]]), Color("8a5a10"), 2.5)

static func cane(c: CanvasItem) -> float:
	ell(c, Vector2(2, 1), Vector2(14, 5), Color(0.25, 0.35, 0.5, 0.25))
	c.draw_line(Vector2(0, 0), Vector2(0, -44), Color("f7f2ea"), 6.0)
	for k in 4:
		c.draw_line(Vector2(0, -3 - k * 11), Vector2(0, -9 - k * 11), Color("d1382c"), 6.0)
	c.draw_arc(Vector2(-8, -44), 8.0, PI, TAU, 14, Color("f7f2ea"), 6.0)
	c.draw_arc(Vector2(-8, -44), 8.0, PI * 1.15, PI * 1.55, 6, Color("d1382c"), 6.0)
	return -56.0

static func bow(c: CanvasItem, o: Vector2, hw: float, h: float, col: Color) -> void:
	c.draw_line(o + Vector2(-hw * 0.5, -hw * 0.75 - h), o + Vector2(hw * 0.5, -hw * 0.25 - h), col, 3.0)
	var bp := o + Vector2(0, -hw * 0.5 - h)
	ell(c, bp + Vector2(-5, -2), Vector2(5, 3.5), col)
	ell(c, bp + Vector2(5, -2), Vector2(5, 3.5), col)
	c.draw_circle(bp + Vector2(0, -1), 2.2, col.darkened(0.2))

static func gifts(c: CanvasItem) -> float:
	ell(c, Vector2(0, 2), Vector2(44, 14), Color(0.25, 0.35, 0.5, 0.28))
	var gold := Color("ffd24a")
	cube(c, 15, 15, Color("c0392b"), Vector2(-14, -1))
	bow(c, Vector2(-14, -1), 15.0, 15.0, gold)
	cube(c, 13, 12, Color("3b6fd1"), Vector2(14, -3))
	bow(c, Vector2(14, -3), 13.0, 12.0, gold)
	cube(c, 10, 11, Color("2e8b57"), Vector2(0, -15))
	bow(c, Vector2(0, -15), 10.0, 11.0, gold)
	return -52.0

static func mound(c: CanvasItem) -> float:
	ell(c, Vector2(0, 0), Vector2(34, 11), Color(0.55, 0.7, 0.86, 0.5))
	ell(c, Vector2(-2, -4), Vector2(30, 11), Color("e4eff6"))
	ell(c, Vector2(-6, -9), Vector2(20, 9), Color("f7fbfd"))
	return -24.0

## Casa completa (usata per chalet e per gli edifici dei quartieri).
static func house(c: CanvasItem, wall: Color, rf: Color, t: float, lit: bool, hw := 44.0, h := 50.0) -> float:
	shadow_box(c, hw, h)
	cube(c, hw, h, wall)
	if lit:
		glow(c, Vector2(-hw * 0.5, -h * 0.8), hw * 0.8, Color(1, 0.8, 0.4))
	for k in range(1, 5):
		var y := h * k / 5.0
		c.draw_line(Vector2(-hw, -hw / 2 - y), Vector2(0, -y), Color(0, 0, 0, 0.09), 1.5)
		c.draw_line(Vector2(0, -y), Vector2(hw, -hw / 2 - y), Color(0, 0, 0, 0.14), 1.5)
	var lf := Vector2(-hw, -hw / 2)
	var bt := Vector2.ZERO
	var rt := Vector2(hw, -hw / 2)
	window(c, lf, bt, 0.12, 0.40, h * 0.40, h * 0.78, lit)
	window(c, lf, bt, 0.58, 0.86, h * 0.40, h * 0.78, lit)
	window(c, bt, rt, 0.68, 0.90, h * 0.42, h * 0.76, lit)
	face(c, bt, rt, 0.22, 0.52, 0.0, h * 0.58, wall.darkened(0.5))
	if lit:
		face(c, bt, rt, 0.26, 0.48, 0.0, h * 0.52, Color("ffb84d"))
		ell(c, bt.lerp(rt, 0.37) + Vector2(0, 3), Vector2(hw * 0.4, 6), Color(1, 0.75, 0.3, 0.22))
	c.draw_circle(bt.lerp(rt, 0.47) + Vector2(0, -h * 0.25), 1.6, Color("ffd24a"))
	var wr := bt.lerp(rt, 0.37) + Vector2(0, -h * 0.72)
	c.draw_arc(wr, 6.5, 0.0, TAU, 16, Color("2e8b57"), 3.5)
	c.draw_circle(wr + Vector2(0, 6), 2.0, Color("d1382c"))
	var rise := hw * 0.95
	roof(c, hw, h, rise, rf)
	var ap_y := -hw / 2 - h - rise
	rbox(c, Rect2(hw * 0.3, ap_y + 4, 10, 24), wall.darkened(0.35))
	rbox(c, Rect2(hw * 0.3 - 2, ap_y + 1, 14, 4), Color("f4f9fc"))
	if lit:
		smoke(c, Vector2(hw * 0.3 + 5, ap_y), t)
		var lc := [Color("ff5a5a"), Color("ffd24a"), Color("5ab4ff")]
		for k in 6:
			var a := 0.5 + 0.5 * sin(t * 3.0 + k)
			var f := k / 5.0
			var ce := Vector2(0, -hw / 2 - h)
			var tl := ce + Vector2(-hw, 0) * 1.15
			var b := ce + Vector2(0, hw / 2) * 1.15
			var r := ce + Vector2(hw, 0) * 1.15
			c.draw_circle(tl.lerp(b, f) + Vector2(0, 3), 2.6, Color(lc[k % 3], a))
			c.draw_circle(b.lerp(r, f) + Vector2(0, 3), 2.6, Color(lc[(k + 1) % 3], 1.0 - a * 0.6))
	return ap_y

static func pine(c: CanvasItem, tint: Color, bulbs: bool, t: float) -> void:
	ell(c, Vector2(16, 4), Vector2(36, 11), Color(0.1, 0.18, 0.35, 0.26))
	rbox(c, Rect2(-5, -14, 10, 16), Color("5b3f2a"))
	var line := tint.darkened(0.55)
	for i in 4:
		var y := -10.0 - i * 21.0
		var w := 38.0 - i * 7.5
		var tip := y - 38.0
		var tier := PackedVector2Array([Vector2(-w, y), Vector2(-w * 0.5, y + 5), Vector2(0, y + 2), Vector2(w * 0.5, y + 5), Vector2(w, y), Vector2(0, tip)])
		c.draw_colored_polygon(tier, tint.lightened(i * 0.05))
		c.draw_colored_polygon(PackedVector2Array([Vector2(0, tip), Vector2(w, y), Vector2(w * 0.5, y + 5), Vector2(0, y + 2)]), Color(0, 0.06, 0.12, 0.22))
		c.draw_polyline(tier + PackedVector2Array([tier[0]]), line, 2.0)
		c.draw_colored_polygon(PackedVector2Array([Vector2(0, tip), Vector2(-w * 0.55, y - 15), Vector2(-w * 0.38, y - 11), Vector2(-w * 0.22, y - 16), Vector2(0, y - 10), Vector2(w * 0.22, y - 16), Vector2(w * 0.38, y - 11), Vector2(w * 0.55, y - 15)]), Color("f4f9fc"))
		c.draw_colored_polygon(PackedVector2Array([Vector2(0, tip), Vector2(w * 0.55, y - 15), Vector2(w * 0.38, y - 11), Vector2(w * 0.22, y - 16), Vector2(0, y - 10)]), Color("d5e4ee"))
	if not bulbs:
		return
	var cols := [Color("ff5a5a"), Color("ffd24a"), Color("5ab4ff"), Color("7dff9a")]
	for i in 28:
		var f := i / 28.0
		var p := Vector2(sin(i * 2.1 + 0.5) * (34.0 * (1.0 - f) + 3.0), -16.0 - f * 92.0)
		var a := 0.55 + 0.45 * sin(t * 3.0 + i)
		c.draw_circle(p, 6.0, Color(cols[i % 4], a * 0.25))
		c.draw_circle(p, 2.6, Color(cols[i % 4], a))
	var star := PackedVector2Array()
	for i in 10:
		star.append(Vector2(cos(-PI / 2 + i * PI / 5), sin(-PI / 2 + i * PI / 5)) * (10.0 if i % 2 == 0 else 4.5) + Vector2(0, -118))
	c.draw_circle(Vector2(0, -118), 18.0 + 3.0 * sin(t * 2.0), Color(1, 0.9, 0.4, 0.22))
	c.draw_colored_polygon(star, Color("ffe066"))

static func snowman(c: CanvasItem) -> void:
	ell(c, Vector2(3, 2), Vector2(22, 7), Color(0.25, 0.35, 0.5, 0.28))
	c.draw_circle(Vector2(0, -14), 15, Color("f7fbfd"))
	c.draw_circle(Vector2(0, -35), 11, Color("f7fbfd"))
	c.draw_circle(Vector2(0, -52), 8, Color("f7fbfd"))
	c.draw_circle(Vector2(-3, -54), 1.3, Color.BLACK)
	c.draw_circle(Vector2(3, -54), 1.3, Color.BLACK)
	c.draw_colored_polygon(PackedVector2Array([Vector2(0, -51), Vector2(10, -49), Vector2(0, -48)]), Color("ff8a2a"))
	rbox(c, Rect2(-8, -66, 16, 9), Color("2b2b3a"))
	rbox(c, Rect2(-11, -60, 22, 3), Color("2b2b3a"))
	rbox(c, Rect2(-9, -44, 18, 4), Color("d64545"))

static func lamp(c: CanvasItem, t: float, lit: bool, col := Color("ffe9a8")) -> float:
	var p := 0.85 + 0.15 * sin(t * 2.5)
	if lit:
		ell(c, Vector2(0, 2), Vector2(46, 16), Color(col, 0.13 * p))
		c.draw_circle(Vector2(0, -62), 18.0 * p, Color(col, 0.2))
	rbox(c, Rect2(-2, -58, 4, 58), Color("2d3440"))
	rbox(c, Rect2(-6, -70, 12, 14), Color("3a4452"))
	rbox(c, Rect2(-4, -68, 8, 10), col if lit else Color("56606c"))
	c.draw_colored_polygon(PackedVector2Array([Vector2(-8, -70), Vector2(0, -78), Vector2(8, -70)]), Color("f4f9fc"))
	return -78.0

static func gear(c: CanvasItem, p: Vector2, r: float, ang: float, col: Color) -> void:
	c.draw_circle(p, r, col)
	for i in 8:
		var a := ang + i * TAU / 8.0
		c.draw_line(p, p + Vector2(cos(a), sin(a)) * (r + 4), col, 4.0)
	c.draw_circle(p, r * 0.35, col.darkened(0.5))

static func sled(c: CanvasItem, ice: bool) -> float:
	ell(c, Vector2(0, -2), Vector2(40, 12), Color(0.25, 0.35, 0.5, 0.25))
	for s in [-1.0, 1.0]:
		c.draw_polyline(PackedVector2Array([Vector2(-34, -10 + s * 6), Vector2(-26, -4 + s * 6), Vector2(26, -4 + s * 6), Vector2(36, -16 + s * 6)]), Color("8b95a1"), 3.0)
	quad(c, Vector2(-28, -8), Vector2(28, -8), Vector2(30, -20), Vector2(-30, -20), Color("c0392b"))
	rbox(c, Rect2(-30, -22, 60, 4), Color("7a2a20"))
	cube(c, 10, 12, Color("2e8b57"), Vector2(-8, -18))
	cube(c, 8, 9, Color("3b6fd1"), Vector2(12, -18))
	c.draw_line(Vector2(-8, -30), Vector2(-8, -38), Color("ffd24a"), 2.0)
	if ice:
		for i in 3:
			c.draw_line(Vector2(-60 + i * 4, -2 + i * 4), Vector2(-36, -6 + i * 3), Color(1, 1, 1, 0.5), 1.5)
	return -48.0

static func shop(c: CanvasItem, wall: Color, awn: Color, bakery: bool, t: float) -> float:
	ell(c, Vector2(0, -4), Vector2(54, 20), Color(0.25, 0.35, 0.5, 0.25))
	cube(c, 36, 40, wall)
	quad(c, Vector2(6, -3), Vector2(30, -15), Vector2(30, -37), Vector2(6, -25), Color("3a2f45"))
	if bakery:
		for p in [Vector2(12, -14), Vector2(19, -18), Vector2(26, -22)]:
			c.draw_circle(p, 3.5, Color("f08aa6"))
			c.draw_circle(p + Vector2(0, -3), 1.8, Color("c0392b"))
	else:
		c.draw_circle(Vector2(14, -16), 4.0, Color("a0673a"))
		c.draw_circle(Vector2(14, -22), 3.0, Color("a0673a"))
		rbox(c, Rect2(20, -26, 6, 6), Color("e0463c"))
		rbox(c, Rect2(20, -20, 6, 6), Color("4aa3df"))
	for i in 6:
		quad(c, Vector2(-36 + i * 12, -18 - 40 + 18 + i * 6 - 18 + 18), Vector2(-24 + i * 12, -18 - 40 + 18 + (i + 1) * 6 - 18 + 18), Vector2(-24 + i * 12, -64 + (i + 1) * 6), Vector2(-36 + i * 12, -64 + i * 6), awn if i % 2 == 0 else Color("f7f2ea"))
	return -78.0

static func spot(c: CanvasItem, kind: String, t: float, lit: bool) -> float:
	var shadow := Color(0.25, 0.35, 0.5, 0.25)
	var wood := Color("8a5a3a")
	match kind:
		"tree":
			c.draw_set_transform(Vector2.ZERO, 0.0, Vector2(1.3, 1.3))
			pine(c, Color("2f6b45"), true, t)
			c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
			return -170.0
		"fountain":
			ell(c, Vector2(0, 0), Vector2(50, 19), Color("9fb2c0"))
			ell(c, Vector2(0, -4), Vector2(42, 15), Color("bfe3f2"))
			rbox(c, Rect2(-5, -32, 10, 28), Color("9fb2c0"))
			ell(c, Vector2(0, -32), Vector2(19, 7), Color("b4c4d0"))
			for i in 5:
				c.draw_line(Vector2(0, -34), Vector2((i - 2) * 9, -58 + absf(i - 2) * 6), Color("e6f6fc"), 3.0)
			return -70.0
		"bench":
			ell(c, Vector2(0, -2), Vector2(38, 10), shadow)
			rbox(c, Rect2(-28, -20, 56, 7), wood)
			rbox(c, Rect2(-28, -36, 56, 6), wood)
			rbox(c, Rect2(-26, -14, 5, 14), wood.darkened(0.3))
			rbox(c, Rect2(21, -14, 5, 14), wood.darkened(0.3))
			rbox(c, Rect2(-28, -24, 56, 4), Color("f2f8fb"))
			rbox(c, Rect2(-28, -39, 56, 3), Color("f2f8fb"))
			return -56.0
		"lamp":
			return lamp(c, t, lit)
		"mailbox":
			ell(c, Vector2(0, -2), Vector2(24, 8), shadow)
			rbox(c, Rect2(-3, -30, 6, 30), wood.darkened(0.2))
			c.draw_circle(Vector2(0, -46), 15, Color("d1382c"))
			rbox(c, Rect2(-15, -46, 30, 18), Color("d1382c"))
			rbox(c, Rect2(-9, -40, 18, 3), Color("3a1512"))
			rbox(c, Rect2(15, -52, 3, 18), Color("7a5a3a"))
			rbox(c, Rect2(18, -52, 9, 6), Color("ffd24a"))
			ell(c, Vector2(0, -60), Vector2(13, 4), Color("f4f9fc"))
			return -80.0
		"post-counter":
			cube(c, 34, 28, wood)
			roof(c, 34, 28, 24, Color("c0392b"))
			for i in 3:
				rbox(c, Rect2(8 + i * 4, -22 - i * 2 - 8, 10, 6), Color("f7f2ea"))
			return -92.0
		"archive":
			cube(c, 28, 48, wood.darkened(0.1))
			for i in 3:
				var y := -12.0 - i * 14.0
				c.draw_line(Vector2(0, y), Vector2(28, y - 14), wood.darkened(0.5), 2.0)
				c.draw_circle(Vector2(14, y - 11), 2.0, Color("ffd24a"))
			return -86.0
		"sled":
			return sled(c, false)
		"oven":
			ell(c, Vector2(0, -2), Vector2(44, 15), shadow)
			var dome := PackedVector2Array()
			for i in 17:
				var a := PI + i * PI / 16.0
				dome.append(Vector2(cos(a) * 32, -26 + sin(a) * 32))
			c.draw_colored_polygon(dome, Color("a4553a"))
			rbox(c, Rect2(-32, -26, 64, 26), Color("8f4731"))
			ell(c, Vector2(0, -12), Vector2(12, 11), Color("2a1a14"))
			if lit:
				c.draw_circle(Vector2(0, -10), 7.0 + 1.5 * sin(t * 8.0), Color("ff9a3c"))
			rbox(c, Rect2(14, -66, 9, 14), Color("6e3a2a"))
			if lit:
				smoke(c, Vector2(18, -66), t)
			return -86.0
		"pastry-window":
			return shop(c, Color("f0d6a2"), Color("d1382c"), true, t)
		"cafe-table":
			ell(c, Vector2(0, -2), Vector2(40, 12), shadow)
			rbox(c, Rect2(-3, -26, 6, 26), wood.darkened(0.3))
			ell(c, Vector2(0, -28), Vector2(24, 9), wood)
			rbox(c, Rect2(-36, -22, 8, 22), wood.darkened(0.2))
			rbox(c, Rect2(28, -22, 8, 22), wood.darkened(0.2))
			c.draw_circle(Vector2(6, -34), 4.0, Color.WHITE)
			if lit:
				for k in 2:
					var ph := fmod(t * 0.6 + k * 0.5, 1.0)
					c.draw_circle(Vector2(6 + sin(ph * 6.0) * 3.0, -38 - ph * 18), 2.5, Color(1, 1, 1, 0.5 * (1.0 - ph)))
			return -66.0
		"pantry":
			cube(c, 24, 54, wood.darkened(0.25))
			var jc := [Color("e05a5a"), Color("e0b24a"), Color("5ab07a"), Color("7a6ad0")]
			for i in 3:
				for j in 3:
					rbox(c, Rect2(3 + j * 6.5, -14 - i * 14 - j * 3.3, 4.5, 8), jc[(i + j) % 4])
			return -78.0
		"toy-train":
			ell(c, Vector2(0, -2), Vector2(52, 16), shadow)
			c.draw_line(Vector2(-48, 4), Vector2(48, -20), Color("6b7480"), 3.0)
			c.draw_line(Vector2(-48, 12), Vector2(48, -12), Color("6b7480"), 3.0)
			cube(c, 12, 16, Color("2e8b57"), Vector2(-26, -2))
			cube(c, 10, 12, Color("c0392b"), Vector2(2, -9))
			cube(c, 10, 12, Color("3b6fd1"), Vector2(24, -15))
			rbox(c, Rect2(-24, -34, 5, 10), Color("2b2b3a"))
			if lit:
				smoke(c, Vector2(-22, -36), t)
			return -66.0
		"toy-window":
			return shop(c, Color("b9a2d9"), Color("2f8f9d"), false, t)
		"toy-shelf":
			cube(c, 22, 58, wood)
			c.draw_circle(Vector2(8, -22), 4.5, Color("e0463c"))
			rbox(c, Rect2(14, -34, 6, 6), Color("4aa3df"))
			c.draw_circle(Vector2(8, -40), 4.0, Color("ffd24a"))
			rbox(c, Rect2(12, -54, 6, 6), Color("7dd07a"))
			return -92.0
		"rocking-horse":
			ell(c, Vector2(0, -2), Vector2(36, 9), shadow)
			c.draw_arc(Vector2(0, -34), 30, PI * 0.2, PI * 0.8, 16, wood.darkened(0.2), 4.0)
			c.draw_line(Vector2(-10, -14), Vector2(-8, -36), wood, 3.0)
			c.draw_line(Vector2(10, -14), Vector2(8, -36), wood, 3.0)
			ell(c, Vector2(0, -42), Vector2(20, 11), Color("c99a6b"))
			c.draw_line(Vector2(14, -46), Vector2(24, -62), Color("c99a6b"), 8.0)
			ell(c, Vector2(26, -64), Vector2(8, 6), Color("c99a6b"))
			c.draw_line(Vector2(12, -52), Vector2(20, -68), Color("5a3a2a"), 3.0)
			c.draw_line(Vector2(-18, -44), Vector2(-26, -34), Color("5a3a2a"), 3.0)
			return -86.0
		"workbench":
			rbox(c, Rect2(-22, -64, 44, 30), wood.darkened(0.45))
			c.draw_line(Vector2(-14, -60), Vector2(-14, -44), Color("c9d2da"), 2.0)
			c.draw_line(Vector2(0, -60), Vector2(0, -42), Color("c9d2da"), 2.0)
			rbox(c, Rect2(8, -60, 8, 14), Color("c0392b"))
			cube(c, 30, 20, wood, Vector2(0, 0))
			rbox(c, Rect2(-10, -34, 6, 10), Color("6b7480"))
			return -86.0
		"fireplace":
			cube(c, 28, 46, Color("8c8f98"))
			quad(c, Vector2(6, -4), Vector2(22, -12), Vector2(22, -32), Vector2(6, -24), Color("1f1512"))
			if lit:
				glow(c, Vector2(14, -18), 26.0, Color(1, 0.6, 0.2))
				for i in 3:
					var w := sin(t * 7.0 + i * 2.0) * 3.0
					c.draw_colored_polygon(PackedVector2Array([Vector2(8 + i * 5, -10 - i * 2), Vector2(10 + i * 5 + w, -26 - i * 2), Vector2(13 + i * 5, -10 - i * 2)]), Color("ff8a2a") if i != 1 else Color("ffd24a"))
			rbox(c, Rect2(-8, -80, 16, 26), Color("7a7d86"))
			if lit:
				smoke(c, Vector2(-4, -80), t)
			return -104.0
		"toy-machine":
			cube(c, 26, 44, Color("2f8f9d"))
			gear(c, Vector2(-10, -50), 11, t * 1.5, Color("e0b24a"))
			gear(c, Vector2(8, -58), 8, -t * 2.0, Color("c9d2da"))
			c.draw_circle(Vector2(0, -92), 5.0, Color("ff5a5a") if int(t * 2.0) % 2 == 0 and lit else Color("6b3030"))
			rbox(c, Rect2(-4, -88, 8, 22), Color("6b7480"))
			rbox(c, Rect2(-40, -8, 36, 6), Color("3a4452"))
			rbox(c, Rect2(-30 + fmod(t * 12.0, 24.0), -16, 8, 8), Color("e0463c"))
			return -116.0
		"warehouse":
			cube(c, 22, 24, wood, Vector2(-14, 0))
			cube(c, 22, 24, wood.darkened(0.1), Vector2(18, -4))
			cube(c, 20, 22, wood.lightened(0.1), Vector2(2, -22))
			c.draw_line(Vector2(2, -44), Vector2(2, -56), Color("ffd24a"), 3.0)
			c.draw_circle(Vector2(-3, -58), 4.0, Color("ffd24a"))
			c.draw_circle(Vector2(7, -58), 4.0, Color("ffd24a"))
			return -78.0
		"bridge":
			ell(c, Vector2(0, 0), Vector2(56, 12), Color(0.3, 0.5, 0.7, 0.25))
			var pts := PackedVector2Array()
			for i in 13:
				var f := i / 12.0
				pts.append(Vector2(-48 + f * 96, -8 - sin(f * PI) * 22))
			c.draw_polyline(pts, wood, 9.0)
			c.draw_polyline(pts, Color("f2f8fb"), 3.0)
			var rail := PackedVector2Array()
			for p in pts:
				rail.append(p + Vector2(0, -16))
			c.draw_polyline(rail, wood.darkened(0.25), 3.0)
			for i in range(0, 13, 3):
				c.draw_line(pts[i], rail[i], wood.darkened(0.25), 3.0)
			return -60.0
		"chalet":
			return house(c, Color("8a5a3a"), Color("5a3a2a"), t, lit, 40.0, 42.0)
		"lake-sled":
			return sled(c, true)
		"shore-lantern":
			return lamp(c, t, lit, Color("bfe8ff"))
		_:
			cube(c, 30, 40, wood)
			return -70.0
	return -70.0

static func giftbox(c: CanvasItem, t: float, lit: bool) -> float:
	var p := 0.8 + 0.2 * sin(t * 2.0)
	ell(c, Vector2(0, -2), Vector2(58, 20), Color(0.25, 0.35, 0.5, 0.28))
	if lit:
		glow(c, Vector2(0, -34), 70.0 * p, Color(1, 0.85, 0.4))
	cube(c, 30, 34, Color("c0392b"))
	var gold := Color("ffd24a")
	quad(c, Vector2(-15, -7.5), Vector2(-5, -2.5), Vector2(-5, -36.5), Vector2(-15, -41.5), gold)
	quad(c, Vector2(12, -6), Vector2(22, -11), Vector2(22, -45), Vector2(12, -40), gold)
	c.draw_colored_polygon(PackedVector2Array([Vector2(-4, -64), Vector2(4, -64), Vector2(4, -44), Vector2(-4, -44)]), Color(0, 0, 0, 0))
	ell(c, Vector2(-10, -52), Vector2(11, 7), gold)
	ell(c, Vector2(10, -52), Vector2(11, 7), gold)
	c.draw_circle(Vector2(0, -50), 5.0, gold.darkened(0.15))
	if lit:
		for i in 6:
			var a := t * 0.8 + i * TAU / 6.0
			c.draw_circle(Vector2(cos(a) * 46, -34 + sin(a) * 30), 2.0 + sin(t * 4.0 + i), Color(1, 0.95, 0.6, 0.9))
	return -72.0

static func badge(c: CanvasItem, pos: Vector2, id: int, status: String, t: float) -> void:
	var col := Color("55606b")
	if status == "available":
		col = Color("e0a920")
		c.draw_arc(pos, 19.0 + 2.0 * sin(t * 3.0), 0, TAU, 28, Color(1, 0.85, 0.3, 0.65), 2.5)
	elif status == "discovered":
		col = Color("c9a23a")
	elif status == "completed":
		col = Color("3fae5d")
	c.draw_circle(pos, 17, Color(0, 0, 0, 0.35))
	c.draw_circle(pos, 15, col)
	c.draw_arc(pos, 16.0, 0.0, TAU, 28, Color(1, 1, 1, 0.55), 1.5)
	if status == "completed":
		c.draw_polyline(PackedVector2Array([pos + Vector2(-6, 0), pos + Vector2(-2, 5), pos + Vector2(7, -5)]), Color.WHITE, 3.0)
	else:
		c.draw_string(ThemeDB.fallback_font, pos + Vector2(-20, 7), str(id) if id > 0 else "?", HORIZONTAL_ALIGNMENT_CENTER, 40, 20, Color.WHITE)
	if status == "locked":
		rbox(c, Rect2(pos + Vector2(9, 6), Vector2(11, 9)), Color("c9d2da"))
		c.draw_arc(pos + Vector2(14.5, 6), 3.6, PI, TAU, 8, Color("c9d2da"), 1.8)


## ---------------------------------------------------------------- stile 2.5D

## Rettangolo con contorno scuro e filo di luce in alto (look "cartone animato").
static func rbox(c: CanvasItem, r: Rect2, col: Color) -> void:
	c.draw_rect(r, col)
	c.draw_rect(r, Color(col.darkened(0.5), 0.7), false, 1.5)
	if r.size.y > 6.0 and r.size.x > 6.0:
		c.draw_line(r.position + Vector2(1.5, 1.5), r.position + Vector2(r.size.x - 1.5, 1.5), Color(col.lightened(0.35), 0.8), 1.5)

## Ombra proiettata da un parallelepipedo (luce da sinistra in alto: l'ombra cade a destra).
static func shadow_box(c: CanvasItem, hw: float, h: float) -> void:
	var s := Vector2(h * 0.55, h * 0.2)
	var pts := PackedVector2Array([Vector2(-hw, -hw / 2), Vector2(0, 0), Vector2(hw, -hw / 2), Vector2(0, -hw)])
	var all := PackedVector2Array(pts)
	for p in pts:
		all.append(p + s)
	var hull := Geometry2D.convex_hull(all)
	if hull.size() > 3:
		hull.remove_at(hull.size() - 1)
		c.draw_colored_polygon(hull, Color(0.1, 0.18, 0.35, 0.3))

static func bunting(c: CanvasItem, hw: float, h: float) -> void:
	var ce := Vector2(0, -hw / 2 - h)
	var tl := ce + Vector2(-hw, 0) * 1.15
	var b := ce + Vector2(0, hw / 2) * 1.15
	var r := ce + Vector2(hw, 0) * 1.15
	var cols := [Color("ff5a5a"), Color("ffd24a"), Color("5ab4ff"), Color("7dff9a")]
	for seg in 2:
		var p0 := tl if seg == 0 else b
		var p1 := b if seg == 0 else r
		c.draw_line(p0 + Vector2(0, 6), p1 + Vector2(0, 6), Color(0.2, 0.2, 0.25), 1.5)
		for k in 8:
			var q := p0.lerp(p1, (k + 0.5) / 8.0) + Vector2(0, 6)
			c.draw_colored_polygon(PackedVector2Array([q + Vector2(-5, 0), q + Vector2(5, 0), q + Vector2(0, 11)]), cols[(k + seg) % 4])

## Cartello su palo davanti agli edifici dei quartieri.
static func sign_board(c: CanvasItem, p: Vector2, icon: String, t: float) -> void:
	var wood := Color("6b4a2e")
	ell(c, p + Vector2(4, 1), Vector2(15, 5), Color(0.1, 0.18, 0.35, 0.28))
	rbox(c, Rect2(p.x - 3, p.y - 52, 6, 52), wood)
	var br := Rect2(p.x - 22, p.y - 84, 44, 36)
	rbox(c, br, Color("f7ecd0"))
	rbox(c, Rect2(br.position.x, br.position.y, 44, 6), Color("c0392b"))
	var ic := p + Vector2(0, -62)
	match icon:
		"mail":
			rbox(c, Rect2(ic.x - 13, ic.y - 8, 26, 17), Color("f7f2ea"))
			c.draw_polyline(PackedVector2Array([Vector2(ic.x - 13, ic.y - 8), Vector2(ic.x, ic.y + 2), Vector2(ic.x + 13, ic.y - 8)]), Color("b04a3a"), 2.0)
		"bread":
			ell(c, ic, Vector2(14, 8), Color("c98a4a"))
			for k in 3:
				c.draw_line(ic + Vector2(-6 + k * 6, -6), ic + Vector2(-3 + k * 6, 5), Color("8a5a2a"), 2.0)
		"toy":
			var star := PackedVector2Array()
			for k in 10:
				star.append(ic + Vector2(cos(-PI / 2 + k * PI / 5), sin(-PI / 2 + k * PI / 5)) * (13.0 if k % 2 == 0 else 6.0))
			c.draw_colored_polygon(star, Color("ffd24a"))
			c.draw_polyline(star + PackedVector2Array([star[0]]), Color("a07a10"), 1.5)
		"gear":
			gear(c, ic, 9.0, t * 0.6, Color("c9a23a"))

## Edifici dei quartieri: casa + dettagli che li rendono riconoscibili.
static func building(c: CanvasItem, kind: String, t: float) -> float:
	var top := 0.0
	match kind:
		"postoffice":
			top = house(c, Color("b04a3a"), Color("2f4f7a"), t, true, 44.0, 52.0)
			var ap := Vector2(-14, top)
			c.draw_line(ap, ap + Vector2(0, -34), Color("6b4a2e"), 3.0)
			c.draw_colored_polygon(PackedVector2Array([ap + Vector2(0, -34), ap + Vector2(24 + sin(t * 3.0) * 2.0, -28), ap + Vector2(0, -20)]), Color("d1382c"))
			sign_board(c, Vector2(70, 4), "mail", t)
		"bakery":
			top = house(c, Color("e8c98a"), Color("7a4a2a"), t, true, 44.0, 52.0)
			var bt := Vector2.ZERO
			var rt := Vector2(44, -22)
			for i in 5:
				var s0 := 0.18 + i * 0.075
				var sc := Color("d1382c") if i % 2 == 0 else Color("f7f2ea")
				face(c, bt, rt, s0, s0 + 0.075, 52.0 * 0.58, 52.0 * 0.72, sc)
				c.draw_circle(bt.lerp(rt, s0 + 0.0375) + Vector2(0, -52.0 * 0.58), 3.0, sc)
			sign_board(c, Vector2(70, 4), "bread", t)
		"toyshop":
			top = house(c, Color("9a7fc0"), Color("2f8f9d"), t, true, 44.0, 52.0)
			bunting(c, 44.0, 52.0)
			cube(c, 8, 8, Color("e0463c"), Vector2(-30, 10))
			cube(c, 8, 8, Color("4aa3df"), Vector2(-44, 4))
			cube(c, 7, 7, Color("ffd24a"), Vector2(-36, 2))
			sign_board(c, Vector2(70, 4), "toy", t)
		"workshop":
			top = house(c, Color("6f8a6a"), Color("b3382f"), t, true, 50.0, 56.0)
			bunting(c, 50.0, 56.0)
			c.draw_set_transform(Vector2(-70, 12), 0.0, Vector2(0.55, 0.55))
			gifts(c)
			c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
			sign_board(c, Vector2(78, 4), "gear", t)
	return top

## ---------------------------------------------------------------- persone

static func _c(look: Dictionary, key: String, def: String) -> Color:
	return Color(str(look.get(key, def)))

## Cappello a cono (Babbo Natale / elfo): si piega verso destra.
static func hat_cone(c: CanvasItem, p: Vector2, r: float, col: Color, brim: Color, pom: Color) -> void:
	var u := r / 56.0
	var pl := PackedVector2Array()
	var pr := PackedVector2Array()
	for i in 9:
		var f := i / 8.0
		pl.append(Vector2(p.x + 46.0 * u * f * f - (52.0 * u * (1.0 - f) + 2.0 * u), p.y - 38.0 * u - 60.0 * u * f + 16.0 * u * f * f))
		pr.append(Vector2(p.x + 46.0 * u * f * f + (52.0 * u * (1.0 - f) + 2.0 * u), p.y - 38.0 * u - 60.0 * u * f + 16.0 * u * f * f))
	for i in range(pr.size() - 1, -1, -1):
		pl.append(pr[i])
	c.draw_colored_polygon(pl, col)
	c.draw_polyline(pl + PackedVector2Array([pl[0]]), col.darkened(0.45), maxf(1.5, 2.0 * u))
	ell(c, p + Vector2(0, -38.0 * u), Vector2(60.0 * u, 12.0 * u), brim)
	c.draw_circle(Vector2(p.x + 46.0 * u, p.y - 82.0 * u), 9.0 * u, pom)

static func head(c: CanvasItem, look: Dictionary, p: Vector2, r: float, t: float, talking: bool, detail: bool) -> void:
	var u := r / 56.0
	var skin := _c(look, "skin", "f6cfa8")
	var hair := _c(look, "hair", "6b3f22")
	var hs := int(look.get("hs", 1))
	var hat := int(look.get("hat", 0))
	var acc := int(look.get("acc", 0))
	var age := int(look.get("age", 1))
	var ink := Color(0.13, 0.12, 0.2)
	var lw := maxf(1.5, 2.2 * u)
	if hs == 2:
		ell(c, p + Vector2(0, 30.0 * u), Vector2(64.0 * u, 66.0 * u), hair)
	elif hs == 5:
		for sd in [-1.0, 1.0]:
			c.draw_circle(p + Vector2(sd * 66.0 * u, 14.0 * u), 17.0 * u, hair)
			c.draw_circle(p + Vector2(sd * 62.0 * u, -6.0 * u), 6.0 * u, Color("d1382c"))
	elif hs == 3:
		c.draw_circle(p + Vector2(0, -62.0 * u), 20.0 * u, hair)
	for sd in [-1.0, 1.0]:
		if bool(look.get("elf", false)):
			c.draw_colored_polygon(PackedVector2Array([p + Vector2(sd * 52.0 * u, -10.0 * u), p + Vector2(sd * 96.0 * u, -34.0 * u), p + Vector2(sd * 52.0 * u, 18.0 * u)]), skin)
		else:
			c.draw_circle(p + Vector2(sd * 55.0 * u, 4.0 * u), 12.0 * u, skin)
	c.draw_circle(p, r, skin)
	c.draw_arc(p, r, 0.0, TAU, 40, skin.darkened(0.45), lw)
	if hs != 0:
		var fr := (-0.26 if age == 0 else -0.34) * r
		var pts := PackedVector2Array()
		for i in 15:
			var a := PI * 0.97 + PI * 1.06 * i / 14.0
			pts.append(p + Vector2(cos(a), sin(a)) * r * 1.07)
		for i in 9:
			var x := r * 0.95 * (1.0 - i / 4.0)
			pts.append(p + Vector2(x, fr + sin(i * 1.9) * 0.06 * r + absf(x) * 0.12))
		c.draw_colored_polygon(pts, hair)
		c.draw_arc(p, r * 1.07, PI * 0.97, PI * 2.03, 24, hair.darkened(0.45), lw)
		if hs == 4:
			for i in 7:
				var a2 := PI * 1.05 + PI * 0.9 * i / 6.0
				c.draw_circle(p + Vector2(cos(a2), sin(a2)) * r * 1.08, r * 0.2, hair)
	var blink := fmod(t + float(look.get("seed", 0)) * 0.7, 4.0) > 3.85
	for sd in [-1.0, 1.0]:
		var ep := p + Vector2(sd * 0.36 * r, 0.02 * r)
		if blink:
			c.draw_line(ep + Vector2(-0.08 * r, 0), ep + Vector2(0.08 * r, 0), ink, lw)
		else:
			c.draw_circle(ep, 0.085 * r, ink)
			if detail:
				c.draw_circle(ep + Vector2(0.03 * r, -0.03 * r), 0.03 * r, Color.WHITE)
		if detail:
			c.draw_line(p + Vector2(sd * 0.52 * r, -0.14 * r), p + Vector2(sd * 0.2 * r, -0.19 * r), hair.darkened(0.3), lw)
			c.draw_circle(p + Vector2(sd * 0.56 * r, 0.3 * r), 0.1 * r, Color(1, 0.5, 0.5, 0.3))
	if acc == 2:
		var bc := _c(look, "beard", "dcdce2")
		ell(c, p + Vector2(0, 0.72 * r), Vector2(0.8 * r, 0.52 * r), bc)
		ell(c, p + Vector2(0, 0.72 * r), Vector2(0.8 * r, 0.52 * r), Color(0, 0, 0, 0))
		c.draw_arc(p + Vector2(0, 0.72 * r), 0.8 * r, 0.1, PI - 0.1, 20, bc.darkened(0.4), lw)
		for sd in [-1.0, 1.0]:
			ell(c, p + Vector2(sd * 0.16 * r, 0.36 * r), Vector2(0.2 * r, 0.09 * r), bc.lightened(0.1))
	c.draw_circle(p + Vector2(0, 0.2 * r), 0.07 * r, skin.darkened(0.12))
	if acc == 4:
		for sd in [-1.0, 1.0]:
			ell(c, p + Vector2(sd * 0.14 * r, 0.34 * r), Vector2(0.18 * r, 0.075 * r), hair)
	if talking:
		ell(c, p + Vector2(0, 0.5 * r), Vector2(0.13 * r, 0.04 * r + 0.1 * r * absf(sin(t * 14.0))), Color("7a2a2a"))
	else:
		c.draw_arc(p + Vector2(0, 0.4 * r), 0.18 * r, 0.3, PI - 0.3, 12, Color("7a2a2a"), lw)
	if acc == 1:
		for sd in [-1.0, 1.0]:
			var gp := p + Vector2(sd * 0.36 * r, 0.02 * r)
			c.draw_circle(gp, 0.19 * r, Color(1, 1, 1, 0.15))
			c.draw_arc(gp, 0.19 * r, 0.0, TAU, 20, ink, lw)
		c.draw_line(p + Vector2(-0.17 * r, 0.02 * r), p + Vector2(0.17 * r, 0.02 * r), ink, lw)
	elif acc == 5:
		c.draw_line(p + Vector2(-r, -0.4 * r), p + Vector2(r, -0.4 * r), ink, 0.12 * r)
		for sd in [-1.0, 1.0]:
			c.draw_circle(p + Vector2(sd * 0.3 * r, -0.42 * r), 0.2 * r, Color(0.35, 0.7, 1.0, 0.8))
			c.draw_arc(p + Vector2(sd * 0.3 * r, -0.42 * r), 0.2 * r, 0.0, TAU, 20, ink, lw)
	match hat:
		1:
			hat_cone(c, p, r, Color("d1382c"), Color("f7f2ea"), Color("f7f2ea"))
		2:
			hat_cone(c, p, r, Color("2e8b57"), Color("f7f2ea"), Color("ffd24a"))
		3:
			var hc := _c(look, "hatc", "3b6fd1")
			var dome := PackedVector2Array()
			for i in 17:
				var a3 := PI + PI * i / 16.0
				dome.append(p + Vector2(cos(a3) * 1.06 * r, -0.3 * r + sin(a3) * 0.95 * r))
			c.draw_colored_polygon(dome, hc)
			c.draw_polyline(dome, hc.darkened(0.45), lw)
			rbox(c, Rect2(p.x - 1.1 * r, p.y - 0.42 * r, 2.2 * r, 0.26 * r), hc.lightened(0.25))
			c.draw_circle(p + Vector2(0, -1.28 * r), 0.2 * r, Color("f7f2ea"))
		4:
			for q in [Vector2(-0.5, -0.95), Vector2(0.5, -0.95), Vector2(0, -1.18)]:
				c.draw_circle(p + q * r, 0.46 * r, Color("fbfbfb"))
				c.draw_arc(p + q * r, 0.46 * r, 0.0, TAU, 20, Color(0.6, 0.62, 0.7), lw)
			rbox(c, Rect2(p.x - 0.78 * r, p.y - 0.95 * r, 1.56 * r, 0.62 * r), Color("fbfbfb"))
		5:
			var cc := _c(look, "hatc", "4a5a7a")
			var cap := PackedVector2Array()
			for i in 17:
				var a4 := PI + PI * i / 16.0
				cap.append(p + Vector2(cos(a4) * 1.05 * r, -0.25 * r + sin(a4) * 0.8 * r))
			c.draw_colored_polygon(cap, cc)
			c.draw_polyline(cap, cc.darkened(0.45), lw)
			ell(c, p + Vector2(0, -0.26 * r), Vector2(0.95 * r, 0.13 * r), cc.darkened(0.25))

## Busto grande per i dialoghi. origin = centro in basso, k = scala.
static func bust(c: CanvasItem, look: Dictionary, origin: Vector2, k: float, t: float, talking: bool) -> void:
	c.draw_set_transform(origin, 0.0, Vector2(k, k))
	var out := _c(look, "out", "2e8b57")
	var out2 := _c(look, "out2", "f7f2ea")
	var skin := _c(look, "skin", "f6cfa8")
	var age := int(look.get("age", 1))
	var acc := int(look.get("acc", 0))
	var w := 0.8 if age == 0 else 1.0
	var by := sin(t * 2.0) * 2.0
	var tp := PackedVector2Array([Vector2(-96 * w, 0), Vector2(-84 * w, -64 + by), Vector2(-42 * w, -96 + by), Vector2(42 * w, -96 + by), Vector2(84 * w, -64 + by), Vector2(96 * w, 0)])
	c.draw_colored_polygon(tp, out)
	c.draw_colored_polygon(PackedVector2Array([Vector2(0, -96 + by), Vector2(42 * w, -96 + by), Vector2(84 * w, -64 + by), Vector2(96 * w, 0), Vector2(0, 0)]), Color(0, 0.05, 0.12, 0.18))
	c.draw_polyline(tp, out.darkened(0.55), 3.0)
	rbox(c, Rect2(-13 * w, -114 + by, 26 * w, 24), skin.darkened(0.1))
	if acc == 3:
		ell(c, Vector2(0, -96 + by), Vector2(50 * w, 17), out2)
		c.draw_arc(Vector2(0, -96 + by), 50 * w, 0.0, PI, 16, out2.darkened(0.4), 2.5)
		c.draw_colored_polygon(PackedVector2Array([Vector2(18 * w, -90 + by), Vector2(42 * w, -80 + by), Vector2(36 * w, -34 + by), Vector2(14 * w, -40 + by)]), out2)
	elif acc == 6:
		var ap := PackedVector2Array([Vector2(-36 * w, -92 + by), Vector2(36 * w, -92 + by), Vector2(48 * w, 0), Vector2(-48 * w, 0)])
		c.draw_colored_polygon(ap, out2)
		c.draw_polyline(ap + PackedVector2Array([ap[0]]), out2.darkened(0.45), 2.5)
		c.draw_line(Vector2(-36 * w, -92 + by), Vector2(-24 * w, -112 + by), out2.darkened(0.3), 3.0)
		c.draw_line(Vector2(36 * w, -92 + by), Vector2(24 * w, -112 + by), out2.darkened(0.3), 3.0)
	else:
		c.draw_colored_polygon(PackedVector2Array([Vector2(-28 * w, -96 + by), Vector2(28 * w, -96 + by), Vector2(0, -62 + by)]), out2)
	var hr := 62.0 if age == 0 else 56.0
	head(c, look, Vector2(0, -160 + by), hr, t, talking, true)
	c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

## Personaggio piccolo che cammina per le strade del villaggio (origine ai piedi).
static func person(c: CanvasItem, look: Dictionary, t: float, walking: bool, flip: bool) -> void:
	var age := int(look.get("age", 1))
	var acc := int(look.get("acc", 0))
	var k := 0.44 if age == 0 else (0.52 if age == 2 else 0.58)
	c.draw_set_transform(Vector2.ZERO, 0.0, Vector2(-k if flip else k, k))
	var out := _c(look, "out", "2e8b57")
	var out2 := _c(look, "out2", "f7f2ea")
	var skin := _c(look, "skin", "f6cfa8")
	var pants := _c(look, "pants", "3a4a66")
	var sw := sin(t * 10.0) * (4.0 if walking else 0.0)
	var bob := absf(sin(t * 10.0)) * (2.0 if walking else 0.0)
	ell(c, Vector2(3, 0), Vector2(16, 5), Color(0.1, 0.18, 0.35, 0.3))
	c.draw_line(Vector2(-4, -14), Vector2(-4 + sw, -2), pants, 5.0)
	c.draw_line(Vector2(4, -14), Vector2(4 - sw, -2), pants, 5.0)
	c.draw_circle(Vector2(-4 + sw, -1), 3.4, Color("2a2a3a"))
	c.draw_circle(Vector2(4 - sw, -1), 3.4, Color("2a2a3a"))
	c.draw_line(Vector2(-10, -33 - bob), Vector2(-14, -20 - bob + sw * 0.5), out, 4.5)
	c.draw_line(Vector2(10, -33 - bob), Vector2(14, -20 - bob - sw * 0.5), out, 4.5)
	c.draw_circle(Vector2(-14, -19 - bob + sw * 0.5), 2.8, skin)
	c.draw_circle(Vector2(14, -19 - bob - sw * 0.5), 2.8, skin)
	var body := PackedVector2Array([Vector2(-11, -13 - bob), Vector2(11, -13 - bob), Vector2(9, -36 - bob), Vector2(-9, -36 - bob)])
	c.draw_colored_polygon(body, out)
	c.draw_polyline(body + PackedVector2Array([body[0]]), out.darkened(0.55), 1.8)
	c.draw_line(Vector2(-10, -20 - bob), Vector2(10, -20 - bob), out2, 2.5)
	if acc == 3:
		ell(c, Vector2(0, -37 - bob), Vector2(11, 4), out2)
	head(c, look, Vector2(0, -52 - bob), 15.0, t, false, false)
	c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

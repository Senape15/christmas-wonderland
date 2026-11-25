extends Node2D
const Art := preload("res://art.gd")
## Effetti animati sul terreno (sotto agli oggetti): brillii sulla neve, riflessi sul lago,
## anello di evidenziazione del quartiere sotto il mouse e cerchio tratteggiato del quartiere attivo.

var m

func _ready() -> void:
	m = get_parent()

func _process(_d: float) -> void:
	queue_redraw()

func _draw() -> void:
	if m == null:
		return
	var t := Time.get_ticks_msec() / 1000.0
	# brillii sulla neve
	for gl in m.glints:
		var a := sin(t * 1.8 + float(gl[1]))
		if a > 0.82:
			Art.sparkle(self, gl[0], 3.0 + 4.0 * (a - 0.82) / 0.18, Color(1, 1, 1, 0.9))
	# lago: strisce di luce che girano e scintille
	if m.zones.has("lago-ghiacciato"):
		var lg: Vector2 = m.zones["lago-ghiacciato"]["g"] + Vector2(0, 0.15)
		for i in 5:
			var an := t * 0.35 + i * 1.3
			var rr := 0.4 + 0.25 * i
			draw_line(m.iso(lg + Vector2(cos(an), sin(an)) * rr), m.iso(lg + Vector2(cos(an + 0.5), sin(an + 0.5)) * rr), Color(1, 1, 1, 0.35), 2.0)
		for i in 7:
			var sa := sin(t * 2.0 + i * 1.9)
			if sa > 0.5:
				var sp: Vector2 = m.iso(lg + Vector2(cos(i * 2.4), sin(i * 2.4)) * (0.3 + 0.12 * i))
				Art.sparkle(self, sp, 3.0 + 3.0 * sa, Color(1, 1, 1, 0.9))
	# lucine colorate lungo i sentieri
	var cols := [Color("ff5a5a"), Color("ffd24a"), Color("5ab4ff"), Color("7dff9a")]
	for pts in m.paths:
		for k in range(1, 16, 2):
			var tg: Vector2 = (pts[k + 1] - pts[k - 1]).normalized()
			for sd in [-1.0, 1.0]:
				var bp: Vector2 = m.iso(pts[k] + tg.orthogonal() * sd * 0.62) + Vector2(0, -3)
				var a := 0.5 + 0.5 * sin(t * 3.0 + k * 1.3 + sd)
				var bc: Color = cols[(k + (0 if sd < 0.0 else 1)) % 4]
				draw_circle(bp, 7.0, Color(bc, 0.2 * a))
				draw_circle(bp, 2.8, Color(bc, 0.35 + 0.65 * a))
	# quartiere sotto il mouse: contorno del lotto
	var hz: String = m.hover_zone
	if hz != "" and m.zones.has(hz):
		var hg: Vector2 = m.zones[hz]["g"]
		var hp: PackedVector2Array = m.square_pts(hg, 2.9 if hz == "piazza-centrale" else 2.5, 0.8)
		hp.append(hp[0])
		draw_polyline(hp, Color(1, 0.95, 0.7, 0.14), 24.0, true)
		draw_polyline(hp, Color(1, 0.95, 0.7, 0.5 + 0.2 * sin(t * 4.0)), 4.0, true)
	# quartiere attivo: contorno dorato che pulsa
	var fz: String = m.focus_zone
	if fz != "" and m.zones.has(fz):
		var fg: Vector2 = m.zones[fz]["g"]
		var fp: PackedVector2Array = m.square_pts(fg, 2.9 if fz == "piazza-centrale" else 2.5, 0.8)
		fp.append(fp[0])
		draw_polyline(fp, Color(1, 0.88, 0.45, 0.16), 26.0, true)
		draw_polyline(fp, Color(1, 0.88, 0.45, 0.6 + 0.25 * sin(t * 2.0)), 5.0, true)

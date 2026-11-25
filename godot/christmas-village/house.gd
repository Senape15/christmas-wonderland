extends Node2D
const Art := preload("res://art.gd")
## Un luogo cliccabile del villaggio (hotspot). Il disegno dipende da `kind`.

var data := {}
var id := 0
var status := "locked"
var kind := ""
var zone := ""
var top := -80.0
var guided := false      # Nico lo sta indicando: freccia dorata
var dim := 1.0:
	set(v):
		dim = v
		_apply_modulate()
var hover := false:
	set(v):
		hover = v
		scale = Vector2.ONE * (1.07 if v else 1.0)

func setup(d: Dictionary) -> void:
	data = d
	var dn = d.get("dayNumber")
	id = int(dn) if dn != null else 0
	status = str(d.get("state", "locked"))
	kind = str(d.get("kind", ""))
	zone = str(d.get("zoneSlug", ""))
	_apply_modulate()

func _apply_modulate() -> void:
	var c := Color(0.68, 0.76, 0.86) if status == "locked" else Color.WHITE
	modulate = Color(c, dim)

func _process(_d: float) -> void:
	queue_redraw()

func contains(global_point: Vector2) -> bool:
	return Rect2(-52, top - 36, 104, -top + 46).has_point(to_local(global_point))

func _draw() -> void:
	var t := Time.get_ticks_msec() / 1000.0
	var p := 0.5 + 0.5 * sin(t * 3.0)
	if status == "available":
		Art.ground_glow(self, 62.0 + 6.0 * p, Color(1, 0.85, 0.35, 0.16))
		Art.ground_ring(self, 54.0 + 8.0 * p, Color(1, 0.85, 0.35, 0.55 + 0.3 * p), 3.0)
		for k in 3:
			var ph := fmod(t * 0.45 + k / 3.0, 1.0)
			Art.sparkle(self, Vector2(sin(k * 2.4 + t) * 34.0, -10.0 - ph * 110.0), 5.0 * (1.0 - ph) + 1.0, Color(1, 0.95, 0.6, 1.0 - ph))
	elif status == "completed":
		Art.ground_glow(self, 50.0, Color(0.4, 0.9, 0.55, 0.12))
	if hover and status != "locked":
		Art.ground_ring(self, 50.0, Color(1, 1, 1, 0.5), 2.5)
	top = Art.spot(self, kind, t, status != "locked")
	Art.badge(self, Vector2(0, top - 24), id, status, t)
	if guided:
		Art.arrow(self, Vector2(0, top - 64.0), t)

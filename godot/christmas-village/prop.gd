extends Node2D
const Art := preload("res://art.gd")
## Elementi di contorno: alberi, pupazzi, lampioni, edifici dei quartieri, decorazioni, scatola finale.

const STATIC_KINDS := ["tree", "snowman", "cane", "gifts", "mound"]

var kind := "tree"
var tint := Color("2f6b45")
var label := ""
var zone := ""           # quartiere a cui appartiene (solo edifici): serve per il clic e per sfumarlo
var lit := true
var top := -90.0
var dim := 1.0:
	set(v):
		dim = v
		modulate = Color(1, 1, 1, v)

func _ready() -> void:
	set_process(not STATIC_KINDS.has(kind))

func _process(_d: float) -> void:
	queue_redraw()

func contains(global_point: Vector2) -> bool:
	return Rect2(-60, top - 40, 120, -top + 50).has_point(to_local(global_point))

func _draw() -> void:
	var t := Time.get_ticks_msec() / 1000.0
	match kind:
		"tree":
			Art.pine(self, tint, false, t)
		"snowman":
			Art.snowman(self)
		"lamp":
			Art.lamp(self, t, true)
		"cane":
			top = Art.cane(self)
		"gifts":
			top = Art.gifts(self)
		"mound":
			top = Art.mound(self)
		"postoffice", "bakery", "toyshop", "workshop":
			top = Art.building(self, kind, t)
		"finalbox":
			top = Art.giftbox(self, t, lit)
	if label != "":
		var y := top - 14.0
		var w := 11.0 * label.length() * 0.62 + 24.0
		draw_rect(Rect2(-w / 2, y - 16, w, 22), Color(0.04, 0.16, 0.1, 0.75))
		draw_string(ThemeDB.fallback_font, Vector2(-w / 2, y), label, HORIZONTAL_ALIGNMENT_CENTER, w, 13, Color("ffe9a8"))

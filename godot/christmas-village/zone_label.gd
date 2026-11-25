extends Node2D
## Cartello sospeso sopra a un quartiere: nome + barra di avanzamento. Clic = zoom sul quartiere.

var slug := ""
var title := ""
var done := 0
var total := 0
var has_available := false
var shown := 1.0          # 0..1, sfuma quando si entra in un quartiere
var _sb := StyleBoxFlat.new()

func _ready() -> void:
	z_index = 200
	_sb.set_corner_radius_all(14)
	_sb.set_border_width_all(2)

func _process(_d: float) -> void:
	visible = shown > 0.01
	if visible:
		queue_redraw()

func _w() -> float:
	var tw := ThemeDB.fallback_font.get_string_size(title, HORIZONTAL_ALIGNMENT_LEFT, -1, 22).x
	return maxf(tw, 110.0) + 40.0

func contains(global_point: Vector2) -> bool:
	if shown < 0.5:
		return false
	var w := _w()
	return Rect2(-w / 2.0, -22.0, w, 72.0).has_point(to_local(global_point))

func _draw() -> void:
	var font := ThemeDB.fallback_font
	var w := _w()
	var t := Time.get_ticks_msec() / 1000.0
	var pulse := 0.5 + 0.5 * sin(t * 3.0)
	var a := shown
	var bc := Color("ffd966") if has_available else Color("8fb8a0")
	var lift := -4.0 * pulse if has_available else 0.0
	draw_set_transform(Vector2(0, lift), 0.0, Vector2.ONE)
	_sb.bg_color = Color(0.04, 0.18, 0.12, 0.9 * a)
	_sb.border_color = Color(bc, a)
	draw_style_box(_sb, Rect2(-w / 2.0, -22.0, w, 58.0))
	draw_colored_polygon(PackedVector2Array([Vector2(-9, 36), Vector2(9, 36), Vector2(0, 48)]), Color(0.04, 0.18, 0.12, 0.9 * a))
	draw_string(font, Vector2(-w / 2.0, 2), title, HORIZONTAL_ALIGNMENT_CENTER, w, 22, Color(1, 0.95, 0.78, a))
	var bx := -w / 2.0 + 20.0
	var bw := w - 40.0
	draw_rect(Rect2(bx, 12, bw, 7), Color(0, 0, 0, 0.45 * a))
	if total > 0:
		draw_rect(Rect2(bx, 12, bw * float(done) / float(total), 7), Color(0.35, 0.8, 0.5, a))
	draw_string(font, Vector2(-w / 2.0, 31), "%d/%d completati" % [done, total], HORIZONTAL_ALIGNMENT_CENTER, w, 13, Color(0.8, 0.9, 0.84, a))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

# -*- coding: utf-8 -*-
# 15가지 자연스러운 블로그 커버 스타일 (800x500 SVG). 시스템 폰트만 사용.
import math
from urllib.parse import quote

def _h(c): return tuple(int(c[i:i+2],16) for i in (1,3,5))
def _s(t): return "#%02x%02x%02x" % t
def mix(a,b,t):
    A,B=_h(a),_h(b); return _s(tuple(round(A[i]*(1-t)+B[i]*t) for i in range(3)))
def esc(x): return str(x).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
NB="#0d1017"
def dk(a,t=0.88): return mix(a,NB,t)
def tsz(t,b,m,s):
    n=len(t); return b if n<=9 else (m if n<=13 else s)
def SVG(marker, body, bg=None):
    pre=f"<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500' viewBox='0 0 800 500'><!--st:{marker}-->"
    if bg is not None: pre+=f"<rect width='800' height='500' fill='{bg}'/>"
    return pre+body+"</svg>"

def _T(x,y,txt,size,fill,family="sans-serif",weight=None,ls=None,anchor=None):
    a=f" text-anchor='{anchor}'" if anchor else ""
    w=f" font-weight='{weight}'" if weight else ""
    l=f" letter-spacing='{ls}'" if ls else ""
    return f"<text x='{x}' y='{y}' font-family='{family}' font-size='{size}'{w}{l}{a} fill='{fill}'>{esc(txt)}</text>"

# ---------- 15 styles ----------
def s_editorial(k,t,s,m,acc,slug):
    g=dk(acc); rule=mix(acc,g,0.55)
    b=(f"<rect x='60' y='78' width='3' height='344' fill='{acc}'/>"
       +_T(742,96,"⬡",24,acc,anchor="end")
       +_T(90,196,k,19,mix(acc,'#ffffff',0.12),ls=4)
       +f"<line x1='90' y1='214' x2='360' y2='214' stroke='{rule}'/>"
       +_T(87,298,t,tsz(t,70,58,48),"#f2f5f8","Georgia, serif")
       +_T(90,344,s,25,mix(acc,'#d3dbe4',0.6))
       +_T(90,392,m,16,mix(acc,'#6b7683',0.45),ls=2))
    return SVG("editorial",b,g)

def s_blueprint(k,t,s,m,acc,slug):
    g=dk(acc,0.90)
    b=("<defs><pattern id='gr' width='48' height='48' patternUnits='userSpaceOnUse'>"
       "<path d='M48 0 H0 V48' fill='none' stroke='#ffffff' stroke-opacity='0.05'/></pattern></defs>"
       "<rect width='800' height='500' fill='url(#gr)'/>"
       +_T(60,72,"// "+slug,17,mix(acc,'#6b7683',0.35),"monospace")
       +f"<g fill='none' stroke='{acc}' stroke-width='2' stroke-opacity='0.8'>"
       "<circle cx='604' cy='150' r='7'/><circle cx='694' cy='120' r='7'/><circle cx='700' cy='206' r='7'/>"
       "<line x1='604' y1='150' x2='694' y2='120'/><line x1='604' y1='150' x2='700' y2='206'/>"
       "<rect x='560' y='96' width='170' height='134' rx='6' stroke-opacity='0.35'/></g>"
       +_T(60,392,t,tsz(t,60,52,44),"#eef3f7",weight=600)
       +f"<line x1='62' y1='410' x2='250' y2='410' stroke='{acc}' stroke-width='3'/>"
       +_T(62,446,s,24,mix(acc,'#c6d0da',0.55))
       +_T(742,470,"800 × 500",13,mix(acc,g,0.55),"monospace",anchor="end"))
    return SVG("blueprint",b,g)

def s_duotone(k,t,s,m,acc,slug):
    g1=mix(acc,'#12151c',0.82); g2=mix(acc,'#12151c',0.66)
    b=(f"<defs><linearGradient id='cg' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='{g1}'/><stop offset='1' stop-color='{g2}'/></linearGradient></defs>"
       "<rect width='800' height='500' fill='url(#cg)'/>"
       f"<circle cx='640' cy='150' r='150' fill='{acc}' opacity='0.10'/>"
       f"<rect x='520' y='150' width='210' height='210' rx='26' fill='{acc}' opacity='0.09'/>"
       f"<rect x='470' y='70' width='150' height='150' rx='20' fill='{mix(acc,'#ffffff',0.2)}' opacity='0.10'/>"
       +_T(60,300,k,18,mix(acc,'#e6ecf2',0.5),ls=3)
       +f"<rect x='62' y='330' width='42' height='6' rx='3' fill='{acc}'/>"
       +_T(60,404,t,tsz(t,64,56,46),"#f3f7fb",weight=700)
       +_T(62,446,s,24,mix(acc,'#c9d3dd',0.55)))
    return SVG("duotone",b)

def s_footer(k,t,s,m,acc,slug):
    g=dk(acc,0.90); band=mix(acc,g,0.35)
    b=(_T(60,96,k,19,mix(acc,'#ffffff',0.15),ls=4)
       +_T(742,96,"⬡",26,acc,anchor="end")
       +_T(60,180,m,16,mix(acc,'#7a8794',0.4),"monospace",ls=2)
       +f"<rect x='0' y='344' width='800' height='156' fill='{band}'/>"
       +f"<rect x='0' y='344' width='800' height='4' fill='{acc}'/>"
       +_T(60,418,t,tsz(t,58,50,42),"#f4f7fa",weight=700)
       +_T(62,458,s,23,mix(acc,'#d3dbe4',0.55)))
    return SVG("footer",b,g)

def s_ghostmark(k,t,s,m,acc,slug):
    g=dk(acc)
    b=(_T(690,300,"⬡",360,acc,anchor="end")  # 거대한 반투명 마크
       .replace("<text","<text opacity='0.07'")
       +_T(60,200,k,19,mix(acc,'#ffffff',0.14),ls=4)
       +_T(60,282,t,tsz(t,70,58,48),"#f2f5f8",weight=700)
       +_T(62,326,s,24,mix(acc,'#cdd6df',0.55))
       +_T(60,372,m,15,mix(acc,'#6b7683',0.45),"monospace",ls=2))
    return SVG("ghostmark",b,g)

def s_diagonal(k,t,s,m,acc,slug):
    g1=dk(acc,0.9); g2=mix(acc,'#12151c',0.72)
    b=(f"<rect width='800' height='500' fill='{g1}'/>"
       f"<polygon points='800,0 800,500 300,500' fill='{g2}'/>"
       f"<line x1='300' y1='500' x2='800' y2='0' stroke='{acc}' stroke-width='2' stroke-opacity='0.6'/>"
       +_T(60,300,k,18,mix(acc,'#ffffff',0.14),ls=3)
       +f"<rect x='62' y='330' width='42' height='6' rx='3' fill='{acc}'/>"
       +_T(60,404,t,tsz(t,60,52,44),"#f2f5f8",weight=700)
       +_T(62,446,s,23,mix(acc,'#cdd6df',0.55)))
    return SVG("diagonal",b)

def s_dots(k,t,s,m,acc,slug):
    g=dk(acc,0.9); dots=""
    for r in range(7):
        for c in range(16):
            x=70+c*44; y=70+r*30; op=round(0.05+0.35*(c/15.0),3)
            dots+=f"<circle cx='{x}' cy='{y}' r='3' fill='{acc}' opacity='{op}'/>"
    b=(dots
       +_T(60,362,k,18,mix(acc,'#ffffff',0.14),ls=3)
       +_T(60,420,t,tsz(t,60,52,44),"#f2f5f8",weight=700)
       +_T(62,460,s,23,mix(acc,'#cdd6df',0.55)))
    return SVG("dots",b,g)

def s_concentric(k,t,s,m,acc,slug):
    g=dk(acc); rings=""
    for i in range(1,9):
        rings+=f"<circle cx='740' cy='70' r='{i*70}' fill='none' stroke='{acc}' stroke-opacity='{round(0.22-i*0.02,3)}' stroke-width='2'/>"
    b=(rings
       +_T(60,300,k,18,mix(acc,'#ffffff',0.14),ls=3)
       +_T(60,378,t,tsz(t,66,56,46),"#f2f5f8",weight=700)
       +_T(62,420,s,24,mix(acc,'#cdd6df',0.55))
       +_T(60,462,m,15,mix(acc,'#6b7683',0.45),"monospace",ls=2))
    return SVG("concentric",b,g)

def s_ticket(k,t,s,m,acc,slug):
    g=dk(acc,0.9); stub=mix(acc,g,0.4)
    b=(f"<rect x='0' y='0' width='150' height='500' fill='{stub}'/>"
       f"<line x1='150' y1='0' x2='150' y2='500' stroke='{g}' stroke-width='2' stroke-dasharray='2 10'/>"
       +f"<text x='96' y='250' font-family='monospace' font-size='18' letter-spacing='4' fill='{mix(acc,'#ffffff',0.2)}' text-anchor='middle' transform='rotate(-90 96 250)'>{esc(m)}</text>"
       +_T(196,210,k,18,mix(acc,'#ffffff',0.14),ls=3)
       +_T(196,286,t,tsz(t,58,50,42),"#f2f5f8",weight=700)
       +_T(198,330,s,23,mix(acc,'#cdd6df',0.55)))
    return SVG("ticket",b,g)

def s_contour(k,t,s,m,acc,slug):
    g=dk(acc); lines=""
    for li in range(6):
        base=120+li*40; amp=26+li*3; pts=[]
        for x in range(0,820,20):
            y=base+amp*math.sin((x/120.0)+li*0.7)
            pts.append(f"{x},{round(y,1)}")
        lines+=f"<polyline points='{' '.join(pts)}' fill='none' stroke='{acc}' stroke-opacity='{round(0.28-li*0.03,3)}' stroke-width='2'/>"
    b=(lines
       +_T(60,392,t,tsz(t,60,52,44),"#f2f5f8",weight=700)
       +_T(62,434,s,23,mix(acc,'#cdd6df',0.55))
       +_T(60,466,m,15,mix(acc,'#6b7683',0.45),"monospace",ls=2))
    return SVG("contour",b,g)

def s_terminal(k,t,s,m,acc,slug):
    g="#12151b"; bar=mix(acc,g,0.75)
    b=(f"<rect x='40' y='60' width='720' height='380' rx='12' fill='{mix(acc,g,0.86)}' stroke='{mix(acc,g,0.6)}'/>"
       f"<rect x='40' y='60' width='720' height='46' rx='12' fill='{bar}'/>"
       "<circle cx='70' cy='83' r='7' fill='#e06c75'/><circle cx='94' cy='83' r='7' fill='#e5c07b'/><circle cx='118' cy='83' r='7' fill='#98c379'/>"
       +_T(150,89,slug,15,mix(acc,'#c6d0da',0.5),"monospace")
       +_T(72,200,k,15,mix(acc,'#ffffff',0.18),"monospace",ls=2)
       +_T(72,262,t,tsz(t,48,42,36),"#eef3f7","monospace",weight=700)
       +_T(72,306,"→ "+s,20,mix(acc,'#cdd6df',0.6),"monospace"))
    return SVG("terminal",b,g)

def s_iso(k,t,s,m,acc,slug):
    g=dk(acc)
    def cube(cx,cy,sz,c):
        top=f"{cx},{cy-sz} {cx+sz*1.2},{cy-sz*0.4} {cx},{cy+sz*0.2} {cx-sz*1.2},{cy-sz*0.4}"
        left=f"{cx-sz*1.2},{cy-sz*0.4} {cx},{cy+sz*0.2} {cx},{cy+sz*1.4} {cx-sz*1.2},{cy+sz*0.8}"
        right=f"{cx+sz*1.2},{cy-sz*0.4} {cx},{cy+sz*0.2} {cx},{cy+sz*1.4} {cx+sz*1.2},{cy+sz*0.8}"
        return (f"<polygon points='{top}' fill='{mix(c,'#ffffff',0.25)}' opacity='0.9'/>"
                f"<polygon points='{left}' fill='{c}' opacity='0.8'/>"
                f"<polygon points='{right}' fill='{mix(c,NB,0.35)}' opacity='0.85'/>")
    blocks=cube(600,150,46,acc)+cube(660,210,46,acc)+cube(540,210,46,acc)
    b=(blocks
       +_T(60,300,k,18,mix(acc,'#ffffff',0.14),ls=3)
       +_T(60,378,t,tsz(t,64,54,46),"#f2f5f8",weight=700)
       +_T(62,420,s,24,mix(acc,'#cdd6df',0.55)))
    return SVG("iso",b,g)

def s_framed(k,t,s,m,acc,slug):
    g=mix(acc,'#eef1f5',0.9); ink="#20242c"
    b=(f"<rect x='34' y='34' width='732' height='432' fill='none' stroke='{mix(acc,ink,0.5)}' stroke-opacity='0.4'/>"
       # corner ticks
       +f"<g stroke='{acc}' stroke-width='3'><line x1='34' y1='34' x2='74' y2='34'/><line x1='34' y1='34' x2='34' y2='74'/>"
       "<line x1='766' y1='466' x2='726' y2='466'/><line x1='766' y1='466' x2='766' y2='426'/></g>"
       +_T(80,150,k,18,acc,ls=4)
       +_T(78,240,t,tsz(t,64,54,46),ink,"Georgia, serif")
       +_T(80,286,s,24,mix(ink,g,0.35))
       +_T(80,430,m,15,mix(ink,g,0.4),"monospace",ls=2))
    return SVG("framed",b,g)

def s_sidebar(k,t,s,m,acc,slug):
    g=dk(acc,0.9); panel=mix(acc,NB,0.62)
    b=(f"<rect x='0' y='0' width='300' height='500' fill='{panel}'/>"
       +_T(150,250,"⬡",120,mix(acc,'#ffffff',0.25),anchor="middle")
       +_T(150,410,m,15,mix(acc,'#ffffff',0.35),"monospace",ls=2,anchor="middle")
       +_T(340,210,k,18,mix(acc,'#ffffff',0.14),ls=3)
       +_T(340,290,t,tsz(t,56,48,40),"#f2f5f8",weight=700)
       +_T(342,334,s,23,mix(acc,'#cdd6df',0.55)))
    return SVG("sidebar",b,g)

def s_orbit(k,t,s,m,acc,slug):
    g=dk(acc)
    b=(f"<ellipse cx='560' cy='210' rx='210' ry='120' fill='none' stroke='{acc}' stroke-opacity='0.5' stroke-width='2' transform='rotate(-20 560 210)'/>"
       f"<circle cx='740' cy='150' r='10' fill='{acc}'/>"
       f"<circle cx='560' cy='210' r='4' fill='{mix(acc,'#ffffff',0.3)}'/>"
       +_T(60,320,k,18,mix(acc,'#ffffff',0.14),ls=3)
       +_T(60,392,t,tsz(t,66,56,46),"#f2f5f8",weight=700)
       +_T(62,434,s,24,mix(acc,'#cdd6df',0.55)))
    return SVG("orbit",b,g)

STYLES={
 "editorial":s_editorial,"blueprint":s_blueprint,"duotone":s_duotone,"footer":s_footer,
 "ghostmark":s_ghostmark,"diagonal":s_diagonal,"dots":s_dots,"concentric":s_concentric,
 "ticket":s_ticket,"contour":s_contour,"terminal":s_terminal,"iso":s_iso,
 "framed":s_framed,"sidebar":s_sidebar,"orbit":s_orbit,
}
ALL=list(STYLES.keys())

def make(style, row):
    svg=STYLES[style](row["kicker"],row["title"],row["subtitle"],row["meta"],row["accent"],row.get("slug",""))
    return "data:image/svg+xml,"+quote(svg,safe="")

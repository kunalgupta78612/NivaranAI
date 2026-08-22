with open('src/pages/AuthPage.jsx', 'r', encoding='utf-8') as f:
    auth = f.read()

bad_leftover = """            
              <button type="button" onClick={() => quickLogin(role)}
                className="btn-primary text-xs px-3.5 py-1.5 font-extrabold shrink-0 shadow-sm">
                1-Click Sign In <ArrowRight size={13} />
              </button>
            </div>"""

auth = auth.replace(bad_leftover, "")

with open('src/pages/AuthPage.jsx', 'w', encoding='utf-8') as f:
    f.write(auth)
print("AuthPage.jsx fixed!")

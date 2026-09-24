import sys

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    header_html = """
  <header class="site-header">
    <div class="nav-wrap">
      <a class="brand" href="../../index.html">Mr. Scandrett's ClassroomOS</a>
      <nav class="site-nav" aria-label="Primary">
        <ul>
          <li><a href="../../index.html">Home</a></li>
          <li><a href="../../steam-lessons.html" aria-current="page">Lessons</a></li>
          <li><a href="../../paths.html">Paths</a></li>
          <li><a href="../../showcase.html">Showcase</a></li>
          <li><a href="../../applications.html">Apps</a></li>
          <li><a href="../../recipe-book.html">Library</a></li>
          <li><a href="../../about.html">About</a></li>
        </ul>
      </nav>
    </div>
  </header>"""

    footer_html = """
  <footer class="site-footer">
    <p>Mr. Scandrett's ClassroomOS &mdash; <a href="../../index.html">Home</a> · <a href="../../steam-lessons.html">Lessons</a></p>
  </footer>
  <script src="../../assets/js/theme-registry.js"></script>
  <script src="../../assets/js/nav-mobile.js"></script>"""

    if "site-header" not in content:
        content = content.replace('<div class="ll-viewport">', '<div class="ll-viewport">\n' + header_html)
    
    if "site-footer" not in content:
        # replace the last </body>
        content = content.replace('</body>', footer_html + '\n</body>')

    with open(filepath, 'w') as f:
        f.write(content)

fix_file('lessons/life-sciences/ecosystems-and-food-webs.html')
fix_file('lessons/life-sciences/luca-last-universal-common-ancestor.html')

import asyncio, sys
from playwright.async_api import async_playwright
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page()
    await pg.goto('file://' + __import__('os').path.abspath('pack.html') + ''); await pg.wait_for_timeout(800)
    await pg.evaluate('document.fonts.ready')
    await pg.pdf(path='../../assets/files/defending-the-faith-attendee-pack.pdf', format='A4', print_background=True, prefer_css_page_size=True)
    await b.close()
asyncio.run(m())

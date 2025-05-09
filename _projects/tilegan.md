---
# this file is written in YAML http://docs.ansible.com/ansible/latest/YAMLSyntax.html
# all lines with a leading sharp are comments and will not be compiled
# longer blocks of text should start with a a leading > to escape all special characters

# URL handle for generated webpage
slug : tilegan

#specifies layout to be used for page generation (do not modify)
layout : publication

#publication title
title : "TileGAN: Synthesis of Large-Scale Non-Homogeneous Textures"

#list all publication authors in correct order
authors :
 "Anna Frühstück": 1
 "Ibraheem Alhashim": 1
 "Peter Wonka": 1
 
authorlinks:
 "Anna Frühstück": 'https://afruehstueck.github.io' 
 "Ibraheem Alhashim": 'https://ialhashim.github.io/' 
 Peter Wonka: 'http://peterwonka.net/' 


affiliations:
 "1": KAUST
 
#insert publication venue (displayed on publication page)
venue:  ACM Transactions on Graphics (Proceedings of SIGGRAPH)
   
#insert short venue (displayed in box in publication list)
shortvenue: SIGGRAPH 2019

#specify publication year
year: 2019

#insert abstract of publication
abstract: We tackle the problem of texture synthesis in the setting where many input images are given and a large-scale output is required. We build on recent generative adversarial networks and propose two extensions in this paper. First, we propose an algorithm to combine outputs of GANs trained on a smaller resolution to produce a large-scale plausible texture map with virtually no boundary artifacts. Second, we propose a user interface to enable artistic control. Our quantitative and qualitative results showcase the generation of synthesized high-resolution maps consisting of up to hundreds of megapixels as a case in point.

#link to hi-res teaser image of publication (please make sure the image is wide, e.g. aspect ratio between 4:2 and 4:1) 
teaser: './assets/publications/tilegan_results.jpg'

#link to smaller thumbnail image of publication (please make sure the aspect ratio is 3:2, suggested size is 150x100px)
thumbnail: './assets/publications/tilegan_paper.jpg'

arXiv: '1904.12795'

figures:
  munch:
    title: 'High-Resolution Results'
    description: 'Please zoom and pan to look at detailed textures of some of our large-scale results.'
    width: '100%'
    link: 'https://www.easyzoom.com/embed/2d83528fd5cc4007953cd6822ed20369?roi=%5B12803%2C-7680%2C7%5D'
  balad:
    width: '100%'
    link: 'https://www.easyzoom.com/embed/d16837356655462bb034a6e2c6c209d8?roi=%5B8000%2C-3057%2C6%5D'
  westeros:
    width: '100%'
    link: 'https://www.easyzoom.com/embed/9b16b3affcc748b986fc32aaac2fb3cb?roi=%5B3135%2C-4391%2C6%5D'

#link to paper PDF
papersource: 'https://dl.acm.org/doi/pdf/10.1145/3306346.3322993'

#link to publication video (optional): you can either upload the video to our website (insert local link) or host it on youtube or vimeo (in this case insert the youtube/vimeo link)
video:
    title : 'Paper Video'  
    link : 'www.youtube.com/watch?v=ye_HZOdW7kg'

github: 'https://github.com/afruehstueck/tileGAN'

#insert citation. please format citation by inserting <br> at line breaks, &nbsp;&nbsp; will insert a tab character to prettify the citation
citation:   >
  @article{Fruehstueck2019TileGAN,<br>
  &nbsp;&nbsp;title = {{TileGAN}: Synthesis of Large-Scale Non-Homogeneous Textures},<br>
  &nbsp;&nbsp;author = {Fr\"{u}hst\"{u}ck, Anna and Alhashim, Ibraheem and Wonka, Peter},<br>
  &nbsp;&nbsp;journal = {ACM Transactions on Graphics (Proc. SIGGRAPH) },<br>
  &nbsp;&nbsp;issue_date = {July 2019},<br>
  &nbsp;&nbsp;volume = {38},<br>
  &nbsp;&nbsp;number = {4},<br>
  &nbsp;&nbsp;year = {2019}<br>
  }
  
#links: 
#- title: Code
#  type:  code
#  url:   'https://github.com/afruehstueck/tileGAN'

#don't forget the leading and trailing --- in a YAML file
---
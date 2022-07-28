---
# this file is written in YAML http://docs.ansible.com/ansible/latest/YAMLSyntax.html
# all lines with a leading sharp are comments and will not be compiled
# longer blocks of text should start with a a leading > to escape all special characters

# URL handle for generated webpage
slug:      insetgan

#specifies layout to be used for page generation (do not modify)
layout:     publication

#publication title
title:      >
   InsetGAN for Full-Body Image Generation

#include in selected publications on front page (optional, delete line if not applicable)
display: selected

#list all publication authors in correct order

authorlinks:
 "Anna Frühstück": 'https://afruehstueck.github.io' 
 "Krishna Kumar Singh": 'http://krsingh.cs.ucdavis.edu/' 
 Eli Shechtman: 'https://research.adobe.com/person/eli-shechtman/' 
 Niloy J. Mitra: 'https://research.adobe.com/person/niloy-mitra/' 
 Peter Wonka: 'http://peterwonka.net/' 
 Jingwan (Cynthia) Lu: 'https://research.adobe.com/person/jingwan-lu/' 

authors:
 "Anna Frühstück": '1, 2'
 "Krishna Kumar Singh": '2'
 "Eli Shechtman": '2'
 "Niloy J. Mitra": '2, 3'
 "Peter Wonka": '1' 
 "Jingwan (Cynthia) Lu": '2'
 
affiliations:
 '1': "KAUST"
 '2': "Adobe Research"
 '3': "University College London"

#insert publication venue (displayed on publication page)
venue: 'accepted to CVPR'
#insert short venue (displayed in box in publication list)
shortvenue: >
   ABC

#specify publication year
year: 2022

#insert abstract of publication
abstract:  While GANs can produce photo-realistic images in ideal conditions for certain domains, the generation of <b>full-body human images</b> remains difficult due to the diversity of identities, hairstyles, clothing, and the variance in pose. Instead of modeling this complex domain with a single GAN, we propose a novel method to <b>combine multiple pretrained GANs</b> where one GAN generates <b>a global canvas</b> (e.g., human body) and a <b>set of specialized GANs, or insets</b>, focus on different parts (e.g., faces, hands) that can be seamlessly inserted onto the global canvas. We model the problem as jointly exploring the respective latent spaces such that the generated images can be combined, by inserting the parts from the specialized generators onto the global canvas, without introducing seams. We demonstrate the setup by combing a full body GAN with a dedicated high-quality face GAN to produce plausible-looking humans. We evaluate our results with quantitative metrics and user studies.
   
#link to hi-res teaser image of publication (please make sure the image is wide, e.g. aspect ratio between 4:2 and 4:1) 
teaser:     './assets/publications/insetgan_applications.jpg'

#link to smaller thumbnail image of publication (please make sure the aspect ratio is 3:2, suggested size is 150x100px)
thumbnail:  './assets/publications/insetgan_paper.jpg'

supplementary_thumbnail:  './assets/publications/insetgan_supplementary.jpg'

paper_description: '<a class="btn btn-primary" href="https://arxiv.org/abs/2203.07293" target="_blank"><span><b><i class="ai ai-arxiv ai-1x"></i> arXiv page</b></span></a>'

#link to paper PDF
papersource: './assets/publications/insetGAN.pdf'

#link to supplementary PDF
supplementarysource: './assets/publications/insetGAN_supp.pdf'

github: 'https://github.com/afruehstueck/insetGAN'

gallery:
  title : 'InsetGAN results'
  text :  'We show a comparison of several examples of StyleGAN2-generated full-body humans. We concentrate on regions that often exhibit unwanted artifacts in our generated results. Using our InsetGAN method, we are able to generate both faces and shoes using dedicated models and generate appropriate bodies for the respective combination. The result yields a seamless transition between the output of the three distinct generator models.'
  rows : 2
  links :
    - './assets/publications/insetgan/result_01_optimized.png'
    - './assets/publications/insetgan/result_04_optimized.png'
    - './assets/publications/insetgan/result_08_optimized.png'
    - './assets/publications/insetgan/result_09_optimized.png'
    - './assets/publications/insetgan/result_07_optimized.png'
    - './assets/publications/insetgan/result_02_optimized.png'
    - './assets/publications/insetgan/result_05_optimized.png'
    - './assets/publications/insetgan/result_03_optimized.png'
    - './assets/publications/insetgan/result_11_optimized.png'
    - './assets/publications/insetgan/result_10_optimized.png'
  labels :
    - 'InsetGAN improved'
    - 'StyleGAN'
  init_state:
    - './assets/publications/insetgan/result_01_optimized.png' 
    - './assets/publications/insetgan/result_01.png'
  
figures:
  pipeline:
    title: 'InsetGAN Pipeline'
    description: 'We show a diagram of the pipeline of our InsetGAN optimization process.'
    width: '768px'
    link: './assets/publications/insetgan_pipeline2.jpg'

sidebysidevideos:
  face_and_body :
    title : 'Face+Body Combination Optimization'
    description : 'We can choose to optimize only one of our generator networks, the inset <i>(left)</i> and optimize for coherence with the canvas, however we see that using this strategy, we cannot sufficiently adapt to desired features from the inset (blond hair) and achieve equally good global coherence as when we jointly optimize both canvas and inset <i>(right)</i>.'
    link1 : './assets/publications/insetgan/optimization_1way.mp4'
    text1 : 'Single GAN optimization'
    link2 : './assets/publications/insetgan/optimization_2way.mp4'
    text2 : 'Dual GAN optimization'		
  latent_space_walk:
    title : 'Latent Space Walks'
    description : 'We show joint latent space walks through two generators, demonstrating that our method can achieve excellent overall image coherence for many different face/body combinations.'
    link1 : './assets/publications/insetgan/lsw_women.mp4'
    link2 : './assets/publications/insetgan/lsw_men.mp4'
    width: '320px'
    
#link to publication video (optional): you can either upload the video to our website (insert local link) or host it on youtube or vimeo (in this case insert the youtube/vimeo link)
video:
    title : 'Paper Video'  
    link : 'https://www.youtube.com/watch?v=YKFYEt5hvOo'


#insert citation. please format citation by inserting <br> at line breaks, &nbsp;&nbsp; will insert a tab character to prettify the citation
citation:   >
  @inproceedings{Fruehstueck2022InsetGAN,<br>
   &nbsp;&nbsp;title = {InsetGAN for Full-Body Image Generation},<br>
   &nbsp;&nbsp;author = {Fr{\"u}hst{\"u}ck, Anna and Singh, {Krishna Kumar} and Shechtman, Eli and Mitra, {Niloy J.} and Wonka, Peter and Lu, Jingwan},<br>
   &nbsp;&nbsp;booktitle = {Proceedings of the IEEE/CVF International Conference on Computer Vision and Pattern Recognition (CVPR)},<br>
   &nbsp;&nbsp;month = {June},<br>
   &nbsp;&nbsp;year = {2022},<br>
   &nbsp;&nbsp;pages = {7723-7732}<br>
  }

#insert links to additional material for the publication (optional)
#links need a title, a URL and a type (this defines the link icon) which can be one of the following values: code, archive, files, slides or text (this is the default icon)
#links: 
# - title: ExampleCode
#   type:  code
#   url:   './publications/supplementary1.zip' 
# - title: ExampleSlides
#   type:  slides
#   url:   './publications/presentation.pptx' 

#don't forget the leading and trailing --- in a YAML file
---
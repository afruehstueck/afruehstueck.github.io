---
# this file is written in YAML http://docs.ansible.com/ansible/latest/YAMLSyntax.html
# all lines with a leading sharp are comments and will not be compiled
# longer blocks of text should start with a a leading > to escape all special characters

# URL handle for generated webpage
slug:     vive3D

#specifies layout to be used for page generation (do not modify)
layout:     publication

#publication title
title:      >
   VIVE3D: Viewpoint-Independent Video Editing using 3D-Aware GANs

#include in selected publications on front page (optional, delete line if not applicable)
display: selected

#list all publication authors in correct order

authorlinks:
 "Anna Frühstück": 'https://afruehstueck.github.io' 
 "Nikolaos Sarafianos": 'https://nsarafianos.github.io' 
 Yuanlu Xu: 'https://web.cs.ucla.edu/~yuanluxu' 
 Peter Wonka: 'http://peterwonka.net' 
 Tony Tung: 'http://www.tonytung.org' 

authors:
 "Anna Frühstück": '1, 2'
 "Nikolaos Sarafianos": '2'
 "Yuanlu Xu": '2'
 "Peter Wonka": '1' 
 "Tony Tung": '2'
 
affiliations:
 '1': "KAUST"
 '2': "Meta Reality Labs Research, Sausalito"

#insert publication venue (displayed on publication page)
venue: 'CVPR'

#insert short venue (displayed in box in publication list)
shortvenue: >
   ABC

#specify publication year
year: 2023

#insert abstract of publication
abstract: We introduce VIVE3D, a novel approach that extends the capabilities of image-based 3D GANs to video editing and is able to represent the input video in an identity-preserving and temporally consistent way. We propose two new building blocks. First, we introduce a <b>novel GAN inversion technique specifically tailored to 3D GANs</b> by jointly embedding multiple frames and optimizing for the camera parameters. Second, besides traditional semantic face edits (e.g. for age and expression), we are <b>the first to demonstrate edits that show novel views of the head</b> enabled by the inherent properties of 3D GANs and our optical flow-guided compositing technique to combine the head with the background video. Our experiments demonstrate that VIVE3D generates high-fidelity face edits at consistent quality from a range of camera viewpoints which are composited with the original video in a temporally and spatially-consistent manner. 
   
#link to hi-res teaser image of publication (please make sure the image is wide, e.g. aspect ratio between 4:2 and 4:1) 
teaser:     './assets/publications/vive3D_obama_main.jpg'

#link to smaller thumbnail image of publication (please make sure the aspect ratio is 3:2, suggested size is 150x100px)
thumbnail:  './assets/publications/vive3d_paper.jpg'

supplementary_thumbnail:  './assets/publications/vive3d_supplementary.jpg'

#paper_description: '<a class="btn btn-primary" href="https://arxiv.org/abs/XXX" target="_blank"><span><b><i class="ai ai-arxiv ai-1x"></i> arXiv page</b></span></a>'

#link to paper PDF
papersource: './assets/publications/VIVE3D_CVPR2023.pdf'

#link to supplementary PDF
supplementarysource: './assets/publications/VIVE3D_CVPR2023_supp.pdf'

#github: 'https://github.com/afruehstueck/insetGAN'

    
#link to publication video (optional): you can either upload the video to our website (insert local link) or host it on youtube or vimeo (in this case insert the youtube/vimeo link)
video:
    title: 'Paper Video'  
    link: 'https://youtu.be/qfYGQwOw8pg'


#insert citation. please format citation by inserting <br> at line breaks, &nbsp;&nbsp; will insert a tab character to prettify the citation
citation:   >
  @inproceedings{Fruehstueck2023VIVE3D,<br>
   &nbsp;&nbsp;title = {{VIVE3D}: Viewpoint-Independent Video Editing using {3D}-Aware {GANs}},<br>
   &nbsp;&nbsp;author = {Fr{\"u}hst{\"u}ck, Anna and Sarafianos, Nikolaos and Xu, Yuanlu and Wonka, Peter and Tung, Tony},<br>
   &nbsp;&nbsp;booktitle = {Proceedings of the IEEE/CVF International Conference on Computer Vision and Pattern Recognition (CVPR)},<br>
   &nbsp;&nbsp;year = {2023}<br>
  }

figures:
  res1:
    title: 'Results'
    description: 'Our method produces natural head compositions for angular changes.'
    width: '100%'
    link: './assets/publications/vive3d/Results_Dennis_8.mp4'
  res0_edit:
    title: 'Results with Editing'
    description: 'Our method seamlessly combines traditional latent space editing techniques with the additional capabilities afforded by the 3D GAN.'
    width: '100%'
    link: './assets/publications/vive3d/Obama_Ages_Grid.mp4'
  res1_edit:
    width: '100%'
    link: './assets/publications/vive3d/Results_John.mp4'
  res2_edit:
    width: '100%'
    link: './assets/publications/vive3d/Results_Hair_Color.mp4'
  comp_age1:
    title: 'Age Editing Comparison'
    description: 'We showcase our method in comparison to related methods for age editing.'
    width: '100%'
    link: './assets/publications/vive3d/Comparison_Age_Obama.mp4'
  comp_age2:
    width: '100%'
    link: './assets/publications/vive3d/Comparison_Age_Marques.mp4'
  comp_angle1:
    title: 'Angle Editing Comparison'
    description: 'We showcase our method in comparison to related methods for editing of the head angle.'
    width: '100%'
    link: './assets/publications/vive3d/Comparison_Angle_Obama.mp4'
  comp_angle2:
    width: '100%'
    link: './assets/publications/vive3d/Comparison_Angle_Dennis.mp4'
#  pipeline:
#   title: 'Personalized Generator Creation'
#    description: 'We showcase our personalized inversion and fine-tuning strategy to obtain a personalized 3D Generator model.'
#    width: '100%'
#    link: './assets/publications/vive3d/inversion.mp4'
  
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
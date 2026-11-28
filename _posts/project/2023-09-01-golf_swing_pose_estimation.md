---
title: Development of a Vision Sensor-based Human Motion Estimation Technique for Golf Swing Dataset Construction in Indoor and Outdoor Environments
mintitle: Vision Sensor-based Human Motion Estimation
image: images/project/golf_swing_pose_estimation/main.png
group: past
tags:
  - Golf Motion
  - Human Pose Estimation
  - Computer Vision
  - Object Recognition
  - Dataset Construction
fund: Collie Technologies Inc.
date_start: 2023-09-01
date_end: 2023-12-31
role: Coordinator
redirect_from:
  - /2023/09/01/project-GolfSwing/
  - /2023/09/01/project_golf_swing.html
---
#### Goal of This Project
- Technology for building data for AI-based golf swing analysis in indoor and outdoor environments
  * Construction of an environment for collecting user swing video data
  * Construction of a dataset for AI-based user swing analysis

- Requirements of the Demand Company
  * Extraction of human skeleton information for golf swing analysis

***

#### Project Contents
**Background and Necessity for Development Technology**

1. The golf industry is expected to reach a size of 9.2 trillion KRW, and it is judged that it can grow in the medium to long term, with the increase in the industry size, the demand for golf trolleys is also growing.
2. This golf trolley market encompasses 10 countries holding 78% of the world's golf courses, with a shift from manual to automatic trolleys. The global trolley market is expected to grow at an average annual rate of 8.4% from 2019, reaching $1.406 billion by 2024.
3. In response to this demand, it is crucial to preempt the development of intelligent golf trolleys. The demand companies are developing a golf trolley that recognizes users and has the capability to analyze golf swings.

**Technology Development Content and Methods**

1. Construction of an environment for collecting user swing video data
  - Selection of vision sensors and analysis of renowned training models for extracting a suitable skeleton for the swing
  - Establishment of a cloud-based server environment for extracting skeletons from field shooting videos
2. Construction of a data structure for AI-based user swing analysis
  - Definition of swing sequences for frame segmentation from videos
  - Annotation techniques for dataset construction

***

{%
  include figure.html
  image="images/project/golf_swing_pose_estimation/main.png"
  caption="Picture source: Zhongyu Jiang et al., “GolfPose: Golf Swing Analyses with a Monocular Camera Based Human Pose Estimation”"
%}

{% capture col1 %}
{%
  include figure.html
  image="images/project/golf_swing_pose_estimation/1.gif"
  caption="Golf swing by pro golfer Sohyun Yu ([video source](https://www.youtube.com/watch?v=pOjEvVIoYBM&t=140s))"
  width="100%"
%}
{% endcapture %}
{% capture col2 %}
{%
  include figure.html
  image="images/project/golf_swing_pose_estimation/2.gif"
  caption="[YOLO-v8x](https://github.com/ultralytics/ultralytics) based Key Point Detection"
  width="100%"
%}
{% endcapture %}
{% include two-col.html col1=col1 col2=col2 %}

{%
  include figure.html
  image="images/project/golf_swing_pose_estimation/3.png"
  caption="Golf Pose Estimation Results by DTW (Dynamic Time Warping)"
  width="60%"
%}

***

#### Participating Researchers
* [Wansoo Kim](/members/wansoo_kim)
* [Joonhyun Kim](/members/joonhyun_kim)

***

#### Funding
{% capture col1 %}
{%
  include feature.html
  image="images/project/funders/hanyang_erica_iucf.png"
%}
{% endcapture %}
{% capture col2 %}
{%
  include feature.html
  image="images/project/funders/collie_technologies.jpg"
  link='https://www.colliegolf.com/'
%}
{% endcapture %}
{% include two-col.html col1=col1 col2=col2 %}

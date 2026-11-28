---
title: Development Service of Systemic Control Algorithm for Development of Safety Guidelines for Mobile Cooperative Robot Workshop
mintitle: Safety Guidelines for Mobile Cooperative Robot Workshop
image: images/project/mobile_cobot_safety_guideline/main.png
group: past
tags:
  - Human-Robot Collaboration
  - Mobile Manipulator
fund: DGIST
date_start: 2022-07-15
date_end: 2022-10-13
role: Coordinator
redirect_from:
  - /2022/10/13/project-dgist_safety_guidline/
  - /2022/10/13/project_dgist_safety_guideline.html
---
#### Goal of This Project
* Although it is a safe enough cooperative robot, there is no difference from the function of a fixed cooperative robot because the cooperative robot attached to the mobile robot cannot be operated while on the move. Therefore, there is a problem that the efficiency of use is significantly reduced by applying the same regulations as industrial robots for work during the installation and movement of the robot.

* Although mobile cooperative robots must perform tasks on the move, such as transportation between processes and intermediate work, collaboration between workers and mobile cooperative robots in logistics warehouses, and collaboration of many cooperative robots, existing regulations prohibit the operation of these robots.

* The purpose is to increase the utilization of robots through the development of a whole body control algorithm for mobile cooperative robots and to improve work efficiency when operating in the workplace

* In addition, by implementing a simulator with a control algorithm, it is intended to be used to analyze risk factors between workers and robots and to review the work efficiency of mobile cooperative robots when developing workplace safety guidelines for mobile cooperative robots.

***

#### Project Contents
**Development of Mechanical Models for Mobile Cooperative Robots**

- Conducting mechanical modeling of the mobile cooperative provided robots
- Verification of results of mechanical modeling through simulation

*When developing a mechanical model, an integrated mechanical model was developed based on instrumental information of cooperative robots and mobile robots (6 degrees of freedom cooperative robots, 3 degrees of freedom mobile robots).*
*Additional mathematical modeling was included when Jacobian or inverse mechanical analysis was required in the development of the Whole Body control algorithm*

**Development of Whole-Body Control Algorithm for Mobile Cooperative Robots**

- Development of a location-based Whole Body control algorithm model.
- Deriving Control Inputs for Whole Body Control of Mobile and Cooperative Robots.
- Development of a Foldbody Control Algorithm Considering Singularity in the Work Area.

**Implementation of a Mobile Cooperative Robot Simulator with Whole-Body Control Algorithm**

* Apply the whole-body control algorithm of mobile cooperative robot to the simulator provided (Simulator provided after contract)
* Development of 2 examples of applying the whole-body control algorithm

{% capture col1 %}
{%
  include figure.html
  image="images/project/mobile_cobot_safety_guideline/1.png"
  caption="Ex1 ) Following sine wave"
%}
{% endcapture %}
{% capture col2 %}
{%
  include figure.html
  image="images/project/mobile_cobot_safety_guideline/2.png"
  caption="Ex2 ) Keeping the distal end at the same point"
%}
{% endcapture %}
{% include two-col.html col1=col1 col2=col2 %}

***

#### Participating Researchers
* [Wansoo Kim](/members/wansoo_kim): Principal Investigator
* [Inhyuk Baek](/members/inhyuk_baek): (S/W) Project Manager, Control Algorithm Development
* [Seungmin Choi](/members/seungmin_choi): (S/W) Control Algorithm Development

***

#### Funding
{%
  include feature.html
  image="images/project/funders/dgist.png"
  link='https://www.dgist.ac.kr/kr/'
%}

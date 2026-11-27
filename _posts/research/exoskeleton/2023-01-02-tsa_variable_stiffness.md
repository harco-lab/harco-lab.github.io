---
title: Twisted String Actuator(TSA) with extended variable stiffness
image: images/research/exoskeleton/tsa_variable_stiffness/main.png
tags:
  - Tendon Mechanism
  - H / W Modeling
author: Dongcheol Shin
member: dongcheol_shin
redirect_from:
  - /2023/01/02/research_dongcheol_shin_tendon1/
  - /2023/01/02/research_dongcheol_shin_tendon_1.html
---
**Goal**

Expanding the fixed variable stiffness of the TSA through variation of offset between strings.

***

**Summary**

Twisted String Actuator(TSA) is an actuator that can produce linear motion through twisting of strings, which converts the rotational motion of a motor into linear motion.

It does not require large space, and it can be used as an actuator suitable for exoskeletons because it can generate a lot of power even with small and weak motor.

Researcher [*Dongcheol Shin*](/members/dongcheol_shin) made a TSA with expanded variable stiffness using expanding mechanism and planetary gear structure. The variable stiffness range is extended through variation of offset between strings of TSA, and it is controlled by an analytical model of the proposed device. There is a future plan to make an exoskeleton that can respond to changes in the movement range due to the applied load through the device.

***

**Topic**
 * Tendon Mechanism
 * H / W Modeling
 * Variable Stiffness

***

{%
  include figure.html
  image="images/research/exoskeleton/tsa_variable_stiffness/1.png"
  caption="Experimental Setting for Tendon Mechanism"
  width="40%"
%}

{% capture col1 %}
{%
  include figure.html
  image="images/research/exoskeleton/tsa_variable_stiffness/2.png"
  caption="TSA Mechanism Illustration 1"
  width="52%"
%}
{% endcapture %}
{% capture col2 %}
{%
  include figure.html
  image="images/research/exoskeleton/tsa_variable_stiffness/3.png"
  caption="TSA Mechanism Illustration 2"
  width="70%"
%}
{% endcapture %}
{% include two-col.html col1=col1 col2=col2 %}

<br><br>

{% capture col1 %}
{%
  include figure.html
  image="images/research/exoskeleton/tsa_variable_stiffness/4.png"
  caption="Changes in Displacement with Variation of the offset between Strings"
  width="100%"
%}
{% endcapture %}
{% capture col2 %}
{%
  include figure.html
  image="images/research/exoskeleton/tsa_variable_stiffness/5.png"
  caption="Comparison of Experimental and Analytical Modelings"
  width="100%"
%}
{% endcapture %}
{% include two-col.html col1=col1 col2=col2 %}

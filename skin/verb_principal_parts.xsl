<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    version="1.0"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:exsl="http://exslt.org/common"
    exclude-result-prefixes="xs">
    
    <xsl:output encoding="UTF-8" indent="yes" method="html"/>
    <xsl:strip-space elements="*"/>
    <xsl:param name="fragment" select="true()"/>
    <xsl:param name="lemma_list"/>

<!--      
     1st singualar present active indicative
     
     1st singular future active indicative
     1st singular future middle [ if no future active ]
     
     1st singular (first) aorist active indicative
     1st singular (second) aorist active indicative [ if it occurs ]     
     1st singular (second) aorist middle indicative [ if it occurs ]
     1st singular (first) aorist passive indicative
     >>1st singular (second) aorist passive indicative [ if it occurs ]
     
     1st singular (first) perfect active indicative [ if it occurs ]
     >>1st singular (second) perfect active indicative [ if it occurs ]
     1st singular perfect middle indicative

     for each of these, sort by:
         - stemtype
         - dialect
         - morphflags
     
     Tables Grouped by Derivtype
     Individual Tables by Lemma

     Tables Grouped by:
         - Tense
         - Voice
     
     Rows grouped:
         - Stemtype
         - Dialect 
         - Morphflags
     
     <div id="derivtype">
         <div id="lemma">
             <div class="tense" alph-tense="tense">
                 <div class="voice" alph-voice="voice">
                 </div>
             </div>
         </div>
     </div>
     
-->     
     
    <xsl:template match="/infl-data">
        <xsl:choose>
            <xsl:when test="$fragment">
                <div id="principal_parts">
                    <xsl:call-template name="selected_lemmas">
                        <xsl:with-param name="data" select="inflection"/>
                    </xsl:call-template>
                  </div>
            </xsl:when>
            <xsl:otherwise>
                <html>
                    <head>
                        <link rel="stylesheet" type="text/css" href="chrome://alpheios/skin/alph-infl.css"/>
                        <link rel="stylesheet" type="text/css" href="infl-form.css"/>
                    </head>
                    <body>
                        <xsl:call-template name="infltables">
                            <xsl:with-param name="data" select="inflection"/>
                        </xsl:call-template>
                        <xsl:call-template name="noderivtables">
                            <xsl:with-param name="data" select="inflection[//hdwd[not(@derivtype)]]"/>
                        </xsl:call-template>
                        <xsl:call-template name="lemmaindex">
                            <xsl:with-param name="data" select="inflection/hdwd-set/hdwd"/>
                        </xsl:call-template>
                    </body>
                </html>
                
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template name="noderivtables">
        <xsl:param name="data"/>
        <xsl:variable name="lemmas"
        select="$data/hdwd-set/hdwd/text()"/>
        <div class="derivtype" id="derivnone">
            <span class="label">No Derivtype
                <a class="prev" href="#deriv37">prev</a>
                <a class="indexlink" href="#lemmaindex">Lemma Index</a>
            </span>
            <xsl:for-each select="$lemmas">
                <xsl:sort select="text()" data-type="text"/>
                <xsl:if test="generate-id(.) = generate-id($lemmas[.=current()])">
                    <xsl:variable name="lastlemma" select="."/>
                    <xsl:call-template name="printlemma">
                        <xsl:with-param name="lastlemma" select="$lastlemma"></xsl:with-param>
                        <xsl:with-param name="data" select="$data[hdwd-set/hdwd[text()=$lastlemma]]/infl-form-set"/>
                    </xsl:call-template>                     
                </xsl:if>
            </xsl:for-each>
            </div>
    </xsl:template>
    
    <xsl:template name="infltables">
        <xsl:param name="data"/>    
        <xsl:variable name="firstgroup" select="$data/hdwd-set/hdwd/@derivtype"/>
        <xsl:for-each select="$firstgroup">
            <xsl:sort 
                select="/infl-data/order-table/order-item[@attname='derivtype' 
                and text()=current()]/@order" 
                data-type="number"/>
            <xsl:if test="generate-id(.) = generate-id($firstgroup[.=current()])">
                <xsl:variable name="lastderiv" select="."/>
                <xsl:variable name="secondgroup"
                select="$data/hdwd-set/hdwd[@derivtype=$lastderiv]/text()"/>
                <xsl:variable name="derivnum" select="number(/infl-data/order-table/order-item[@attname='derivtype'and text()=$lastderiv]/@order)"/>
                <div class="derivtype" id="{concat('deriv',$derivnum)}">
                    <span class="label"><xsl:value-of select="$lastderiv"/>
                    <a class="next" href="#{concat('deriv',$derivnum+1)}">next</a>
                    <xsl:if test="$derivnum != '1'">
                        <a class="prev" href="#{concat('deriv',$derivnum - 1)}">prev</a>
                    </xsl:if>
                      <a class="indexlink" href="#lemmaindex">Lemma Index</a>
                    </span>
                    <xsl:for-each select="$secondgroup">
                        <xsl:sort select="count($data[hdwd-set/hdwd[@derivtype=$lastderiv and text()=current()]]/infl-form-set)" data-type="number" order="descending"/>
                        <xsl:if test="generate-id(.) = generate-id($secondgroup[.=current()])">
                            <xsl:variable name="lastlemma" select="."/>
                             <xsl:call-template name="printlemma">
                                 <xsl:with-param name="lastlemma" select="$lastlemma"></xsl:with-param>
                                 <xsl:with-param name="lastderiv" select="$lastderiv"></xsl:with-param>
                                 <xsl:with-param name="data" select="$data[hdwd-set/hdwd[@derivtype=$lastderiv and text()=$lastlemma]]/infl-form-set"/>
                             </xsl:call-template>                     
                        </xsl:if>
                    </xsl:for-each>
                </div>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>
   
   <xsl:template name="printlemma">
       <xsl:param name="data"/>
       <xsl:param name="lastlemma"/>
       <xsl:param name="lastderiv" select="'&#160;'"/>
       <xsl:variable name="thirdgroup" select="$data/@tense"/>
       <div class="lemma" id="{$lastlemma}">
           <div class="derivlabel"><xsl:value-of select="$lastderiv"/></div>
           <span class="label"><xsl:value-of select="$lastlemma"/></span>
           <div class="lemma-forms">
             <xsl:for-each select="$thirdgroup">
               <xsl:sort
                   select="/infl-data/order-table/order-item[@attname='tense' 
                   and text()=current()]/@order" 
                   data-type="number"/>
               <xsl:if test="generate-id(.) = generate-id($thirdgroup[.=current()])">
                   <xsl:variable name="lasttense" select="."/>
                   <xsl:variable name="fourthgroup" select="$data[@tense=$lasttense]/@voice"/>
                   <div class="tense">
                       <xsl:for-each select="$fourthgroup">
                           <xsl:sort
                               select="/infl-data/order-table/order-item[@attname='voice' 
                               and text()=current()]/@order" 
                               data-type="number"/>
                           <xsl:if test="generate-id(.) = generate-id($fourthgroup[.=current()])">
                               <xsl:variable name="lastvoice" select="."/>
                               <xsl:variable name="rowdata" 
                                   select="$data[@tense=$lasttense and @voice=$lastvoice]/infl-form"/>
                               <div class="voice">
                                   <span class="label"><xsl:value-of select="$lasttense"> </xsl:value-of> &#160;<xsl:value-of select="$lastvoice"/></span>
                                   <xsl:for-each select="$rowdata">
                                       <xsl:sort select="@stemtype" data-type="text"/>
                                       <xsl:sort select="@dialect" data-type="text"/>
                                       <xsl:sort select="@morphflags" data-type="text"/>
                                       <div class="infl-form">
                                           <span><xsl:value-of select="."/></span>
                                           <xsl:if test="@stemtype or @dialect or @morphflags">
                                               <span class="form-properties">
                                                   (
                                                   <span class="stemtype"><xsl:value-of select="@stemtype"/></span>
                                                   <xsl:if test="@stemtype and (@dialect or @morphflags)">,&#160;</xsl:if>
                                                   <span class="dialect"><xsl:value-of select="@dialect"/></span>
                                                   <xsl:if test="@dialect and @morphflags">,&#160;</xsl:if>
                                                   <span class="stemtype"><xsl:value-of select="@morphflags"/></span>
                                                   )
                                               </span>
                                           </xsl:if>
                                       </div>
                                   </xsl:for-each>
                               </div>
                           </xsl:if>
                       </xsl:for-each>
                       
                   </div>
               </xsl:if>
           </xsl:for-each>
           </div>
         </div>
   </xsl:template>

    <xsl:template name="lemmaindex">
        <xsl:param name="data"/>
        <div id="lemmaindex">
            <div class="label">Lemma Index</div>
            <xsl:for-each select="$data">
                <xsl:sort select="." data-type="text"/>
                <xsl:variable name="lemma" select="text()"/>
                <div><a href="#{$lemma}"><xsl:value-of select="$lemma"/></a></div>
            </xsl:for-each>
        </div>
    </xsl:template>

    <xsl:template name="selected_lemmas">
        <xsl:param name="data"/>
        <xsl:param name="list" select="$lemma_list"/>
        <xsl:param name="delimiter" select="' '"/>
        <xsl:variable name="newlist">
            <xsl:choose>
                <xsl:when test="contains($list, $delimiter)"><xsl:value-of select="normalize-space($list)" /></xsl:when>
                <xsl:otherwise><xsl:value-of select="concat(normalize-space($list), $delimiter)"/></xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:variable name="first" select="substring-before($newlist, $delimiter)" />
        <xsl:variable name="remaining" select="substring-after($newlist, $delimiter)" />
            <xsl:call-template name="printlemma">
                <xsl:with-param name="lastlemma" select="$first"/> 
                 <xsl:with-param name="data" select="$data[hdwd-set/hdwd/text()=$first]/infl-form-set"/>
            </xsl:call-template>
        <xsl:if test="$remaining">
            <xsl:call-template name="selected_lemmas">
                <xsl:with-param name="data" select="$data"/>
                <xsl:with-param name="list" select="$remaining" />
                <xsl:with-param name="delimiter"><xsl:value-of select="$delimiter"/></xsl:with-param>
            </xsl:call-template>
        </xsl:if>
    </xsl:template>
    
</xsl:stylesheet>